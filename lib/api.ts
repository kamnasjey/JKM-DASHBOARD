/**
 * All protected API calls go through /api/proxy/* endpoints.
 * The Next.js server verifies the NextAuth session and forwards
 * requests to the backend with the internal API key.
 * 
 * IMPORTANT: All browser-side calls use RELATIVE URLs only.
 * Never use absolute URLs (https://...) for internal API endpoints.
 */

import { normalizeLocalApiPath } from "./urls"

export interface ApiError {
  message: string
  status: number
}

function toMessage(text: string): string {
  return text.replace(/^"|"$/g, "").trim()
}

function normalizeNotice(input: any): string {
  if (typeof input === "string") return input
  if (input && typeof input === "object") {
    const message = input.message || input.reasonText || input.suggestion || input.rootCause
    return typeof message === "string" ? message : JSON.stringify(input)
  }
  return String(input)
}

function sanitizeSimulatorV2Response(res: any) {
  if (!res || typeof res !== "object") return res

  if (Array.isArray(res.meta?.warnings)) {
    res.meta.warnings = res.meta.warnings.map(normalizeNotice)
  }

  if (res.error) {
    if (typeof res.error === "string") {
      res.error = { code: "ERROR", message: res.error }
    } else if (typeof res.error === "object") {
      res.error.message = normalizeNotice(res.error.message ?? res.error)
      if (Array.isArray(res.error.suggestedActions)) {
        res.error.suggestedActions = res.error.suggestedActions.map(normalizeNotice)
      }
    }
  }

  return res
}

function normalizeSignalArray(input: any[]): any[] {
  if (!Array.isArray(input)) return []
  return input
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null
      const symbol = typeof raw.symbol === "string" ? raw.symbol : null
      const direction = typeof raw.direction === "string" ? raw.direction : null
      if (!symbol || !direction) return null

      const createdAtRaw = raw.created_at ?? raw.createdAt ?? raw.timestamp ?? raw.ts
      let created_at = raw.created_at
      if (created_at === undefined) {
        if (typeof createdAtRaw === "number") created_at = createdAtRaw
        else if (typeof createdAtRaw === "string") {
          const ts = Date.parse(createdAtRaw)
          if (!Number.isNaN(ts)) created_at = Math.floor(ts / 1000)
        }
      }

      return {
        ...raw,
        symbol,
        direction,
        created_at,
      }
    })
    .filter(Boolean)
}

// Fetch wrapper
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Normalize to same-origin relative URL.
  // This prevents accidental hardcoded/ENV absolute domains (e.g. *.vercel.app) from being used in browser fetch.
  const normalizedPath = normalizeLocalApiPath(path)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  try {
    const response = await fetch(normalizedPath, { ...options, headers })

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
      throw new Error("Unauthorized")
    }

    // 402/403 - Access denied (will be handled by AccessDeniedGuard)
    if (response.status === 402 || response.status === 403) {
      throw new Error("Хандах эрхгүй")
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? ""
      const rawText = await response.text()

      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(rawText)

          const candidate =
            (data && typeof data === "object" &&
              ((data as any).message ?? (data as any).error ?? (data as any).detail)) ||
            (typeof data === "string" ? data : null)

          if (candidate) {
            if (typeof candidate === "string") throw new Error(candidate)
            if (typeof candidate === "number" || typeof candidate === "boolean") {
              throw new Error(String(candidate))
            }
            // Object/array detail
            throw new Error(JSON.stringify(candidate))
          }

          // If backend returned JSON but no message fields, show something meaningful.
          throw new Error(`API Error (${response.status}): ${rawText || "Unknown"}`)
        } catch {
          // fall through to plain text
        }
      }

      const msg = toMessage(rawText)
      throw new Error(msg || `API Error (${response.status}) ${response.statusText}`)
    }

    return response.json()
  } catch (err: any) {
    if (err.message === "Failed to fetch" || err instanceof TypeError) {
      console.warn("[api] Network error:", normalizedPath)
    }
    throw err
  }
}

export const api = {
  // Metrics
  getMetrics: () => apiFetch<any>("/api/proxy/metrics"),
  metrics: () => apiFetch<any>("/api/proxy/metrics"),

  // Signals (PUBLIC endpoint - no auth required)
  getSignals: (params?: { limit?: number; symbol?: string }) => {
    const qs = new URLSearchParams()
    qs.set("limit", String(params?.limit ?? 50))
    if (params?.symbol) qs.set("symbol", params.symbol)
    // Use public /api/signals (proxies to backend, no auth)
    return apiFetch<{ ok: boolean; count: number; signals: any[] }>(`/api/signals?${qs.toString()}`)
      .then(res => normalizeSignalArray(res.signals || []))
  },
  signals: (params?: { limit?: number; symbol?: string }) => api.getSignals(params),

  // User signals (Firestore user-data, authenticated)
  userSignals: (params?: { limit?: number; symbol?: string; status?: string }) => {
    const qs = new URLSearchParams()
    qs.set("limit", String(params?.limit ?? 50))
    if (params?.symbol) qs.set("symbol", params.symbol)
    if (params?.status) qs.set("status", params.status)
    return apiFetch<{ ok: boolean; signals: any[] }>(`/api/user-signals?${qs.toString()}`)
      .then(res => normalizeSignalArray(res.signals || []))
  },

  // Update signal entry tracking
  updateSignalEntry: (signalKey: string, entryTaken: boolean | null, outcome?: "win" | "loss" | "pending" | null) =>
    apiFetch<{ ok: boolean; signal_key: string; entry_taken: boolean | null; outcome: string | null }>(
      `/api/user-signals/${encodeURIComponent(signalKey)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ entry_taken: entryTaken, outcome }),
      }
    ),

  // Symbols
  getSymbols: () => apiFetch<string[]>("/api/proxy/symbols"),
  symbols: () => api.getSymbols(),

  // Strategies (legacy - proxies to backend)
  getStrategies: () => apiFetch<any>("/api/proxy/strategies"),
  strategies: () => api.getStrategies(),
  updateStrategies: (data: any) =>
    apiFetch("/api/proxy/strategies", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Strategies v2 (Firestore-based, no backend needed)
  strategiesV2: {
    list: (params?: { limit?: number; cursor?: string }) => {
      const qs = new URLSearchParams()
      if (params?.limit) qs.set("limit", String(params.limit))
      if (params?.cursor) qs.set("cursor", params.cursor)
      const query = qs.toString()
      return apiFetch<{
        ok: boolean
        strategies: any[]
        count: number
        nextCursor: string | null
        maxAllowed: number
      }>(`/api/strategies/v2${query ? `?${query}` : ""}`)
    },
    get: (id: string) =>
      apiFetch<{ ok: boolean; strategy: any }>(`/api/strategies/v2/${id}`),
    create: (data: {
      name: string
      description?: string
      enabled?: boolean
      detectors: string[]
      symbols?: string[]
      timeframe?: string
      config?: Record<string, any>
    }) =>
      apiFetch<{ ok: boolean; strategy: any }>("/api/strategies/v2", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      name?: string
      description?: string | null
      enabled?: boolean
      detectors?: string[]
      symbols?: string[] | null
      timeframe?: string | null
      config?: Record<string, any>
    }) =>
      apiFetch<{ ok: boolean; strategy: any }>(`/api/strategies/v2/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ ok: boolean; deleted: boolean }>(`/api/strategies/v2/${id}`, {
        method: "DELETE",
      }),
  },

  // Outcomes (SL/TP hit tracking)
  outcomes: (days: number = 30) =>
    apiFetch<any>(`/api/proxy/outcomes?days=${days}`),

  // Logs
  getLogs: () => apiFetch<string[]>("/api/proxy/log"),
  logs: () => api.getLogs(),

  // Health (public)
  getHealth: () => apiFetch<{ status: string }>("/api/proxy/health"),
  health: () => api.getHealth(),

  // Annotations
  annotations: (symbol: string) =>
    apiFetch<any>(`/api/proxy/annotations?symbol=${encodeURIComponent(symbol)}`),

  // Profile (reads from Firestore directly)
  profile: () => apiFetch<any>("/api/profile"),
  updateProfile: (payload: any) =>
    apiFetch<any>("/api/user-prefs", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateUserPrefs: (payload: {
    telegram_chat_id?: string | null;
    telegram_enabled?: boolean;
    display_name?: string | null;
    min_rr?: number;
    min_score?: number;
  }) =>
    apiFetch<any>("/api/user-prefs", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Telegram test message
  telegramTest: () =>
    apiFetch<{ ok: boolean; message: string }>("/api/telegram/test", {
      method: "POST",
    }),

  // Engine controls
  engineStatus: () => apiFetch<any>("/api/proxy/engine/status"),
  manualScan: () => apiFetch<any>("/api/proxy/engine/manual-scan", { method: "POST" }),
  startScan: () => apiFetch<any>("/api/proxy/engine/start", { method: "POST" }),
  stopScan: () => apiFetch<any>("/api/proxy/engine/stop", { method: "POST" }),

  // Market Feed Status (anti-drift poller with root cause detection)
    feedStatus: () => apiFetch<{
      ok: boolean
      serverTime: string
      running: boolean
      engine: {
        pollerRunning: boolean
        lastTickAt: string | null
        loopSkewSec: number
      }
      provider: {
        name: string
        healthy: boolean
        lastSuccess: string | null
        lastError: string | null
      }
      summary: {
        symbols: number
        timeframes: string[]
        totalItems: number
        totalFetches: number
        totalErrors: number
        itemsInBackoff: number
      }
      items: Array<{
        symbol: string
        tf: string
        lastCandleTs: string | null
        ageSec: number
        lagSec: number
        nextDueAt: string | null
        nextDueInSec: number | null
        backoffSec: number
        consecutiveErrors: number
        lastError: string | null
        // Root cause detection fields
        instrumentType: "CRYPTO" | "FOREX" | "METAL" | "INDEX" | "UNKNOWN"
        marketState: "OPEN" | "CLOSED" | "UNKNOWN"
        rootCause: "OK" | "MARKET_CLOSED" | "PROVIDER_RATE_LIMIT" | "PROVIDER_LAG" | "ENGINE_LAG" | "NO_DATA"
        reasonText: string
        expectedPeriodSec: number
      }>
      worst: {
        symbol: string | null
        tf: string | null
        ageSec: number
        lagSec: number
        rootCause: string | null
        reasonText: string | null
        marketState: string | null
      } | null
      simVersion: string
    }>("/api/proxy/market/feed/status"),
  
  refreshFeed: (symbol?: string, tf?: string) => {
    const params = new URLSearchParams()
    if (symbol) params.set("symbol", symbol)
    if (tf) params.set("tf", tf)
      return apiFetch<{ ok: boolean; refreshed: any[] }>(`/api/proxy/market/feed/refresh?${params}`, { method: "POST" })
  },

  // Admin backfill
  backfill: (payload: any) =>
    apiFetch<any>("/api/proxy/admin/backfill", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Signal detail
  signalDetail: (id: string) => apiFetch<any>(`/api/proxy/signals/${id}`),

  // Signal AI explanation
  explainSignal: (signalId: string) => 
    apiFetch<{
      ok: boolean
      signal_id: string
      explain_type: "ai" | "basic"
      explanation: string
      signal_summary?: {
        symbol: string
        direction: string
        entry: number
        sl: number
        tp: number
        rr: number
      }
      ai_error?: string
    }>(`/api/proxy/signals/${signalId}/explain`, { method: "POST" }),

  // Candles for charting
  candles: (symbol: string, tf: string = "M5", limit: number = 200) =>
    apiFetch<any>(`/api/proxy/markets/${encodeURIComponent(symbol)}/candles?tf=${tf}&limit=${limit}`),

  // Detectors list - use local /api/detectors endpoint (source of truth with Cyrillic labels)
  detectors: () => apiFetch<{
    ok: boolean
    detectors: Array<{
      id: string
      labelMn: string
      descriptionMn: string
      category: "gate" | "trigger" | "confluence"
    }>
    count: number
    categories: {
      gate: number
      trigger: number
      confluence: number
    }
  }>("/api/detectors"),

  // Detailed metrics for performance dashboard
  detailedMetrics: () => apiFetch<any>("/api/proxy/metrics/detailed"),

  // Backtest - historical signals
  backtest: (params: {
    strategy_id?: string
    detectors?: string[]
    symbol?: string
    days?: number
  }) =>
    apiFetch<any>("/api/proxy/backtest", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Backtest Simulation - run detectors on historical candle data
  backtestSimulate: (params: {
    strategy_id?: string
    detectors?: string[]
    symbol?: string
    days?: number
    min_rr?: number
  }) =>
    apiFetch<any>("/api/proxy/backtest/simulate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Shared strategies (public library)
  sharedStrategies: () => apiFetch<any>("/api/proxy/strategies/shared"),
  
  shareStrategy: (strategy: {
    strategy_id: string
    detectors: string[]
    min_score?: number
    min_rr?: number
    allowed_regimes?: string[]
    description?: string
  }) =>
    apiFetch<any>("/api/proxy/strategies/share", {
      method: "POST",
      body: JSON.stringify(strategy),
    }),
  
  importStrategy: (shareId: string) =>
    apiFetch<any>(`/api/proxy/strategies/import/${shareId}`, {
      method: "POST",
    }),
  
  // Strategy Tester API
  strategyTester: {
    run: (params: {
      symbol: string
      detectors: string[]
      entry_tf?: string
      trend_tf?: string
      start_date?: string
      end_date?: string
      spread_pips?: number
      slippage_pips?: number
      commission_per_trade?: number
      initial_capital?: number
      risk_per_trade_pct?: number
      intrabar_policy?: "sl_first" | "tp_first" | "bar_magnifier" | "random"
      min_rr?: number
      min_score?: number
      max_trades_per_day?: number
      max_bars_in_trade?: number
    }) =>
      apiFetch<any>("/api/proxy/strategy-tester/run", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    
    listRuns: (limit = 50, offset = 0) =>
      apiFetch<any>(`/api/proxy/strategy-tester/runs?limit=${limit}&offset=${offset}`),
    
    getRun: (runId: string) =>
      apiFetch<any>(`/api/proxy/strategy-tester/runs/${runId}`),
    
    getTrades: (runId: string) =>
      apiFetch<any>(`/api/proxy/strategy-tester/runs/${runId}/trades`),
    
    getEquityCurve: (runId: string) =>
      apiFetch<any>(`/api/proxy/strategy-tester/runs/${runId}/equity`),
    
    deleteRun: (runId: string) =>
      apiFetch<any>(`/api/proxy/strategy-tester/runs/${runId}`, {
        method: "DELETE",
      }),
  },

  // Strategy Simulator API (supports both single-TF and multi-TF modes)
  simulator: {
    run: (params: {
      // Single TF mode
      symbol?: string
      timeframe?: string
      strategy_id?: string
      range?: {
        mode: "PRESET" | "CUSTOM"
        preset?: "7D" | "30D" | "90D" | "6M" | "1Y"
        from_ts?: number
        to_ts?: number
      }
      assumptions?: {
        intrabar_policy?: "SL_FIRST" | "TP_FIRST"
        spread?: number
        slippage?: number
        commission?: number
        max_trades?: number
      }
      // Multi-TF mode (v2)
      symbols?: string[]
      from?: string
      to?: string
      timeframes?: string[]
      mode?: string
      strategy?: any
    }) =>
      apiFetch<any>("/api/proxy/strategy-sim/run", {
        method: "POST",
        body: JSON.stringify(params),
      }),

    symbols: () =>
      apiFetch<{ ok: boolean; symbols: string[] }>("/api/proxy/strategy-sim/symbols"),
  },

  // Strategy Simulator V2 - MVP (dashboard-only calls)
  simulatorV2: {
    run: (params: {
      strategyId: string
      symbols: string[]
      from: string  // YYYY-MM-DD
      to: string    // YYYY-MM-DD
      timeframe?: "auto" | "5m" | "15m" | "1h" | "4h" | "1d"
      mode?: "winrate" | "detailed"
      demoMode?: boolean  // Force demo mode
    }) =>
      apiFetch<{
        ok: boolean
        // Async job response (when async=true)
        jobId?: string
        status?: "queued" | "running" | "completed" | "failed"
        summary?: {
          entries: number
          tp: number
          sl: number
          open: number
          timeExit: number
          winrate: number
        }
        byHorizon?: {
          intraday: { entries: number; tp: number; sl: number; open: number; timeExit: number; winrate: number }
          swing: { entries: number; tp: number; sl: number; open: number; timeExit: number; winrate: number }
        }
        insights?: {
          winrateBySession: Record<string, number>
          winrateByVolatility: Record<string, number>
          winrateByTrendAligned: Record<string, number>
          tagsAny?: {
            mode: "any" | "primary"
            minTradesPerTag: number
            shareType: "tag_frequency" | "trade_share"
            overall: { trades: number; tp: number; sl: number; winrate: number }
            byTag: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
            topPositive: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
            topNegative: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
          }
          tagsPrimary?: {
            mode: "any" | "primary"
            minTradesPerTag: number
            shareType: "tag_frequency" | "trade_share"
            overall: { trades: number; tp: number; sl: number; winrate: number }
            byTag: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
            topPositive: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
            topNegative: Array<{
              tag: string
              trades: number
              tp: number
              sl: number
              winrate: number
              open: number
              timeExit: number
              share: number
              shareType: "tag_frequency" | "trade_share"
              lift: number
              stderr: number
              liftZ: number
              significant: boolean
              priorityScore: number
            }>
          }
        }
        suggestions?: Array<{
          // Base suggestions
          title?: string
          why: string
          how?: string
          // Data-driven suggestions
          type?: string
          priority?: "high" | "medium" | "low"
          suggestion?: string
        }>
        meta?: {
          baseTimeframe: string
          range: { from: string; to: string }
          demoMode: boolean
          symbols: string[]
          confidenceScore: number
          dataTier: "green" | "yellow" | "red"
          warnings: string[]
        }
        // Per-trade details (when mode="detailed" or backend supports it)
        trades?: Array<{
          entry_ts: number
          exit_ts: number
          direction: "BUY" | "SELL"
          entry: number
          sl: number
          tp: number
          outcome: "TP" | "SL"
          r: number
          duration_bars: number
          detector: string
          symbol?: string
          tf?: string
        }>
        demoMode?: boolean
        demoMessage?: string
        error?: {
          code: string
          message: string
          gapRatio?: number
          confidenceScore?: number
          suggestedActions?: string[]
          details?: any
        }
      }>("/api/simulator/run", {
        method: "POST",
        body: JSON.stringify(params),
      }).then(sanitizeSimulatorV2Response),

    // Poll job status for async simulation
    jobStatus: (jobId: string) =>
      apiFetch<{
        ok: boolean
        job?: {
          id: string
          status: "queued" | "running" | "completed" | "failed"
          progress?: {
            stage: string
            percent: number
            message: string
          }
          result?: any
          error?: string
          createdAt: string
          updatedAt: string
        }
        error?: string
      }>(`/api/simulator/job/${jobId}`),
  },

  // Scanner API (continuous setup finder)
  // V2: strategyId ONLY - backend fetches detectors from Firestore
  scanner: {
    start: (params: {
      strategyId: string
      // V2: DO NOT send detectors - backend fetches from strategyId
      symbols: string[]
      timeframes?: string[]
      lookbackDays?: number
      intervalSec?: number
      maxPairsPerCycle?: number
      // Setup criteria
      minRR?: number
      minConfirmHits?: number
      minBarsScanned?: number
      maxMissingPct?: number
      minConfidence?: number
    }) =>
      apiFetch<{
        ok: boolean
        message?: string
        runId?: string
        error?: string
        status?: any
        meta?: {
          warnings?: string[]
        }
      }>("/api/scanner/start", {
        method: "POST",
        body: JSON.stringify(params),
      }),

    stop: () =>
      apiFetch<{
        ok: boolean
        message?: string
        status?: any
      }>("/api/scanner/stop", {
        method: "POST",
      }),

    status: () =>
      apiFetch<{
        ok: boolean
        running: boolean
        runId?: string
        startedAt?: string
        lastCycleAt?: string
        nextCycleAt?: string
        config?: {
          strategyId: string
          symbolsCount: number
          symbols: string[]
          timeframes: string[]
          lookbackDays: number
          intervalSec: number
          minRR: number
          minConfirmHits: number
          maxMissingPct: number
        }
        detectors?: {
          countNormalized: number
          unknownCount: number
          unknownSample: string[]
          gatesCount: number
          triggersCount: number
          confluenceCount: number
          strategyName: string
          fetchedAt: string
          fetchError?: string
        }
        lastOutcome?: {
          rootCause: string
          symbol?: string
          tf?: string
          ts?: string
        }
        counters?: {
          cycles: number
          setupsFound: number
          errors: number
          deduped: number
          cooldownSkipped: number
          noSetupReasons: Record<string, number>
        }
        lastErrors?: Array<{
          ts: string
          type?: string
          error: string
        }>
        lastSetups?: Array<{
          ts: string
          symbol: string
          tf: string
          confidence: number
        }>
        simVersion?: string
      }>("/api/scanner/status"),

    results: (limit: number = 100) =>
      apiFetch<{
        ok: boolean
        count: number
        statusMessage?: string
        noSetupReasons?: Record<string, number>
        results: Array<{
          ts: string
          runId?: string
          symbol: string
          tf: string
          strategyId: string
          strategyName?: string
          detectorsRequested?: string[]
          detectorsNormalized?: string[]
          hitsPerDetector?: Record<string, number>
          gatesPassed?: boolean
          gateBlocks?: string[]
          triggersHit?: number
          confluenceHit?: number
          rr?: number
          confidence?: number
          bias?: string
          barsScanned?: number
          dataCoverage?: {
            expectedBars?: number
            actualBars?: number
            missingPct?: number
          }
          explain?: Record<string, any>
        }>
        simVersion?: string
        dashboardVersion?: string
        error?: string
      }>(`/api/scanner/results?limit=${limit}`),
  },

  // ========== BACKEND STRATEGY APIs (via proxy) ==========
  // These call the Python backend through Next.js route handlers
  
  backendStrategies: {
    /**
     * Get strategies + activeStrategyId + activeStrategyMap from Python backend
     */
    get: (uid: string) =>
      apiFetch<{
        ok: boolean
        uid: string
        strategies: Array<{
          id: string
          name: string
          detectors: string[]
          symbols: string[]
          timeframes: string[]
          minRR: number
          enabled: boolean
          tags?: string[]
          isStarterClone?: boolean
        }>
        activeStrategyId: string
        activeStrategyMap: Record<string, string>
        symbolEnabled?: Record<string, boolean>
        requireExplicitMapping?: boolean
        count: number
      }>(`/api/proxy/backend-strategies/${uid}`),

    /**
     * Set the global active strategy ID
     */
    setActiveStrategy: (uid: string, activeStrategyId: string) =>
      apiFetch<{ ok: boolean; uid: string; activeStrategyId: string }>(
        `/api/proxy/active-strategy/${uid}`,
        {
          method: "POST",
          body: JSON.stringify({ activeStrategyId }),
        }
      ),

    /**
     * Save per-symbol strategy mapping with enable/disable state
     * @param map - { symbol: strategyId } mapping
     * @param symbolEnabled - { symbol: boolean } enable/disable state
     * @param requireExplicitMapping - if true, symbols without mapping are not scanned
     */
    setStrategyMap: (
      uid: string, 
      map: Record<string, string | null>,
      symbolEnabled?: Record<string, boolean>,
      requireExplicitMapping?: boolean
    ) =>
      apiFetch<{ 
        ok: boolean; 
        uid: string; 
        activeStrategyMap: Record<string, string>;
        symbolEnabled?: Record<string, boolean>;
      }>(
        `/api/proxy/strategy-map/${uid}`,
        {
          method: "POST",
          body: JSON.stringify({ map, symbolEnabled, requireExplicitMapping }),
        }
      ),
  },

  /**
   * Get 24/7 engine status with per-symbol strategy info
   */
  engineStatus247: (uid: string) =>
    apiFetch<{
      ok: boolean
      uid: string
      engineRunning: boolean
      scanMode: string
      lastCycleTs: string
      lastOutcome?: {
        cycle: number
        ts: string
        symbolsScanned: number
        setupsFound: number
        rootCause: string
        noSetupReasons?: Record<string, number>
        marketClosedSymbols?: string[]
      }
      effectiveSymbols: Array<{
        symbol: string
        strategyIdUsed: string
        strategyNameUsed?: string
        isMapped: boolean
        lastScanTs?: string
        lastSetupFoundTs?: string
        setupsFound24h?: number
        delayReason?: string
        lagSec?: number
        lastCandleTs?: string
      }>
      error?: string
    }>(`/api/proxy/engine-status/${uid}`),

  // ========== CHART DRAWINGS APIs ==========
  // User chart drawings (stored in Firestore)

  drawings: {
    /**
     * List drawings for a symbol/timeframe
     */
    list: (symbol: string, timeframe: string, limit: number = 100) =>
      apiFetch<{
        ok: boolean
        drawings: Array<{
          id: string
          symbol: string
          timeframe: string
          tool: "horizontal_line" | "trend_line" | "fibonacci" | "rectangle"
          color: string
          lineWidth: number
          lineStyle: "solid" | "dashed" | "dotted"
          label?: string | null
          visible: boolean
          locked: boolean
          price?: number
          startTime?: number
          startPrice?: number
          endTime?: number
          endPrice?: number
          levels?: number[]
          fillColor?: string | null
          createdAt: string
          updatedAt: string
        }>
        count: number
      }>(`/api/user-drawings?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`),

    /**
     * Create a new drawing
     */
    create: (drawing: {
      symbol: string
      timeframe: string
      tool: "horizontal_line" | "trend_line" | "fibonacci" | "rectangle"
      color: string
      lineWidth: number
      lineStyle: "solid" | "dashed" | "dotted"
      label?: string
      visible?: boolean
      locked?: boolean
      price?: number
      startTime?: number
      startPrice?: number
      endTime?: number
      endPrice?: number
      levels?: number[]
      fillColor?: string
    }) =>
      apiFetch<{
        ok: boolean
        drawing: any
      }>("/api/user-drawings", {
        method: "POST",
        body: JSON.stringify(drawing),
      }),

    /**
     * Update a drawing
     */
    update: (drawingId: string, updates: Partial<{
      color: string
      lineWidth: number
      lineStyle: "solid" | "dashed" | "dotted"
      label: string | null
      visible: boolean
      locked: boolean
      price: number
      startTime: number
      startPrice: number
      endTime: number
      endPrice: number
      levels: number[]
      fillColor: string | null
    }>) =>
      apiFetch<{
        ok: boolean
        drawing: any
      }>(`/api/user-drawings/${encodeURIComponent(drawingId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),

    /**
     * Delete a drawing
     */
    delete: (drawingId: string) =>
      apiFetch<{
        ok: boolean
        deleted: string
      }>(`/api/user-drawings/${encodeURIComponent(drawingId)}`, {
        method: "DELETE",
      }),

    /**
     * Clear all drawings for a symbol/timeframe
     */
    clearAll: (symbol: string, timeframe: string) =>
      apiFetch<{
        ok: boolean
        deletedCount: number
      }>(`/api/user-drawings?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
        method: "DELETE",
      }),
  },
}
