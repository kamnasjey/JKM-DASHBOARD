/**
 * POST /api/simulator/run
 * 
 * Strategy Simulator - Server-side route handler
 * 
 * Architecture:
 * - Client sends request here (dashboard domain only)
 * - We authenticate via NextAuth session
 * - Load access from Firestore (users/{uid}.hasPaidAccess)
 * - Load strategy from Firestore (users/{uid}/strategies/{strategyId})
 * - Normalize detectors to canonical IDs
 * - Proxy compute to backend with INTERNAL_API_KEY
 * - Always include meta.simVersion and explain in response
 * - Return result to client
 * 
 * NO PRISMA DEPENDENCY.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { isOwnerEmail } from "@/lib/owner"
import { randomUUID } from "crypto"
import {
  validateSimulatorRequest,
  formatZodErrors,
  getDateRangeDays,
  limitDateRange,
} from "@/lib/schemas/simulator"
import { getStrategy } from "@/lib/user-data/strategies-firestore-store"
import { storeSimulatorDiagnostics, maskUserId, SimulatorDiagnostics } from "@/lib/simulator-diagnostics"
import { normalizeDetectorIds, normalizeDetectorList } from "@/lib/detectors/normalize"
import { getDashboardVersion } from "@/lib/version"
import { getDetectorById } from "@/lib/detectors/catalog"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes - for long simulations (30/90 days)

// Backend configuration
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

// Demo mode limits
const DEMO_MAX_SYMBOLS = 1
const DEMO_MAX_DAYS = 7
/**
 * Check if user has paid access from Firestore
 */
async function checkUserAccess(userId: string): Promise<boolean> {
  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    const data = userDoc.data()
    return data?.hasPaidAccess === true || data?.has_paid_access === true
  } catch {
    return false
  }
}

/**
 * POST /api/simulator/run
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  // --- 1. Authentication ---
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Login required" },
      { status: 401 }
    )
  }
  
  const userId = (session.user as any).id as string
  const userEmail = (session.user as any).email as string
  
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "INVALID_SESSION", message: "Session missing user ID" },
      { status: 401 }
    )
  }
  
  // --- 2. Parse and validate request body ---
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "Invalid JSON body" },
      { status: 400 }
    )
  }


  const validation = validateSimulatorRequest(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: formatZodErrors(validation.error),
      },
      { status: 422 }
    )
  }

  const { strategyId, symbols, from, to, timeframe, mode, demoMode: clientDemoMode } = validation.data

  // --- 3. Check access + load trading settings ---
  const isOwner = isOwnerEmail(userEmail)
  const hasPaidAccess = isOwner ? true : await checkUserAccess(userId)

  // Load user trading settings (min_rr, min_score) from Firestore
  let userMinRr = 2.5  // default
  let userMinScore = 0  // default
  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    if (userData?.min_rr !== undefined) userMinRr = Number(userData.min_rr) || 2.5
    if (userData?.min_score !== undefined) userMinScore = Number(userData.min_score) || 0
  } catch (err) {
    console.warn(`[${requestId}] Failed to load user trading settings:`, err)
  }

  // Allow gaps when demoMode is requested or when no paid access.
  const allowGaps = clientDemoMode || !hasPaidAccess
  // Only apply demo limits when access is not paid.
  const applyDemoLimits = !hasPaidAccess
  let demoMode = allowGaps
  let effectiveSymbols = symbols
  let effectiveFrom = from
  let effectiveTo = to
  let demoMessage: string | undefined

  if (applyDemoLimits) {
    // Demo mode limitations
    effectiveSymbols = symbols.slice(0, DEMO_MAX_SYMBOLS)
    const limited = limitDateRange(from, to, DEMO_MAX_DAYS)
    effectiveFrom = limited.from
    effectiveTo = limited.to
    
    const rangeChanged = effectiveFrom !== from || effectiveTo !== to
    const symbolsLimited = effectiveSymbols.length < symbols.length
    
    const limits: string[] = []
    if (symbolsLimited) limits.push(`${DEMO_MAX_SYMBOLS} symbol`)
    if (rangeChanged) limits.push(`${DEMO_MAX_DAYS} days`)
    
    demoMessage = `Demo mode: limited to ${limits.join(", ")}. Upgrade for full access.`
    
    console.log(`[${requestId}] Demo mode for user ${userId}: ${demoMessage}`)
  }
  
  // --- 4. Load strategy from Firestore ---
  console.log(`[${requestId}] Loading strategy: userId=${userId}, strategyId=${strategyId}`)
  const strategy = await getStrategy(userId, strategyId)
  console.log(`[${requestId}] Strategy result: ${strategy ? `found (name=${strategy.name})` : 'NOT FOUND'}`)

  if (!strategy) {
    console.error(`[${requestId}] STRATEGY_NOT_FOUND: userId=${userId}, strategyId=${strategyId}`)
    return NextResponse.json(
      {
        ok: false,
        error: "STRATEGY_NOT_FOUND",
        message: `Strategy '${strategyId}' not found (user: ${userId.substring(0, 8)}...)`,
      },
      { status: 404 }
    )
  }

  // Validate strategy has detectors
  if (!strategy.detectors || strategy.detectors.length === 0) {
    console.warn(`[${requestId}] Strategy '${strategyId}' has no detectors`)
    return NextResponse.json(
      {
        ok: false,
        error: "NO_DETECTORS",
        message: "This strategy has no detectors configured. Please edit the strategy and add at least one detector.",
        strategyId,
        strategyName: strategy.name,
      },
      { status: 422 }
    )
  }
  
  // --- 5. Check internal API key ---
  if (!INTERNAL_API_KEY) {
    console.error(`[${requestId}] INTERNAL_API_KEY not configured`)
    return NextResponse.json(
      { 
        ok: false, 
        error: "CONFIG_ERROR", 
        message: "Backend not configured",
        meta: { requestId, dashboardVersion: getDashboardVersion() }
      },
      { status: 500 }
    )
  }
  
  // --- 6. Build backend payload ---
  // Normalize detectors to canonical IDs with full tracking
  const originalDetectors = strategy.detectors || []
  const normalizeResult = normalizeDetectorIds(originalDetectors)
  const { requested: detectorsRequested, normalized: detectorsNormalized, unknown: detectorsUnknown } = normalizeResult
  
  // Log normalization for debugging
  if (detectorsUnknown.length > 0) {
    console.warn(`[${requestId}] Unknown detectors: ${detectorsUnknown.join(", ")}`)
  }
  
  const backendPayload = {
    uid: userId,
    requestId,
    strategyId: strategy.id,  // camelCase for backend compatibility
    strategy_id: strategy.id, // snake_case for backend compatibility
    symbols: effectiveSymbols,
    from: effectiveFrom,
    to: effectiveTo,
    // "auto" should map to "multi" for multi-TF mode with full trades
    // Backend only returns full trades array when timeframe="multi"
    timeframe: (timeframe === "auto" || !timeframe) ? "multi" : timeframe,
    mode: mode || "winrate",
    strategy: {
      id: strategy.id,
      name: strategy.name,
      detectors: detectorsNormalized,  // Only canonical IDs
      detectorsRequested,
      detectorsNormalized,
      detectorsUnknown,
      symbols: strategy.symbols || [],
      timeframe: strategy.timeframe,
      config: strategy.config || {},
    },
    demoMode,
    min_rr: userMinRr,
    min_score: userMinScore,
    async: true, // Enable async mode for real progress tracking
  }
  
  // Log detector count for debugging
  console.log(`[${requestId}] Simulator request: userId=${userId}, strategyId=${strategyId}, detectorsRequested=${detectorsRequested.length}, detectorsNormalized=${detectorsNormalized.length}, unknown=${detectorsUnknown.length}, detectors=[${detectorsNormalized.join(", ")}]`)
  
  // --- 7. Proxy to backend ---
  const backendUrl = `${BACKEND_ORIGIN}/api/strategy-sim/run`
  const startTime = Date.now()
  const dashboardVersion = getDashboardVersion()
  
  // STEP 5: Add timeout to prevent long-running requests
  const BACKEND_TIMEOUT_MS = 300_000 // 300 seconds (5 minutes) - for 30/90 day simulations
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), BACKEND_TIMEOUT_MS)
  
  try {
    let backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
        "x-request-id": requestId,
      },
      body: JSON.stringify(backendPayload),
      signal: abortController.signal,
    })
    
    clearTimeout(timeoutId) // Clear timeout after response received
    const elapsedMs = Date.now() - startTime
    const backendText = await backendResponse.text()
    let backendJson: any
    let demoModeUsed = demoMode
    let demoMessageUsed = demoMessage
    
    try {
      backendJson = JSON.parse(backendText)
    } catch {
      console.error(`[${requestId}] Backend returned non-JSON:`, backendText.slice(0, 500))
      return NextResponse.json(
        { ok: false, error: "BACKEND_ERROR", message: "Backend returned invalid response" },
        { status: 502 }
      )
    }

    // Handle async job response - return jobId immediately for progress polling
    if (backendJson?.ok && backendJson?.jobId && backendJson?.status === "queued") {
      console.log(`[${requestId}] Async job queued: ${backendJson.jobId}`)
      return NextResponse.json({
        ok: true,
        jobId: backendJson.jobId,
        status: "queued",
        meta: {
          requestId,
          dashboardVersion,
          detectorsRequested,
          detectorsNormalized,
          detectorsUnknown,
          demoMode,
        }
      })
    }

    // Log backend errors for troubleshooting
    if (!backendJson?.ok) {
      console.error(`[${requestId}] Backend error:`, backendJson?.error?.code || backendJson?.error, backendJson?.message)
    }

    // --- 8. Retry on DATA_GAP with demoMode=true (allow gaps without demo limits) ---
    if (!backendResponse.ok && backendJson?.error?.code === "DATA_GAP" && !demoMode) {
      const retryPayload = { ...backendPayload, demoMode: true }
      const retryController = new AbortController()
      const retryTimeoutId = setTimeout(() => retryController.abort(), BACKEND_TIMEOUT_MS)
      try {
        const retryResponse = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": INTERNAL_API_KEY,
            "x-request-id": requestId,
          },
          body: JSON.stringify(retryPayload),
          signal: retryController.signal,
        })
        clearTimeout(retryTimeoutId)
        const retryText = await retryResponse.text()
        const retryJson = JSON.parse(retryText)
        if (retryResponse.ok) {
          backendResponse = retryResponse
          backendJson = retryJson
          demoModeUsed = true
          demoMessageUsed = "Data gaps detected. demoMode=true enabled to proceed with gaps." 
        }
      } catch {
        clearTimeout(retryTimeoutId)
      }
    }

    // --- 9. Map backend errors ---
    if (!backendResponse.ok) {
      const status = backendResponse.status
      
      if (status === 401 || status === 403) {
        console.error(`[${requestId}] Backend auth error: ${status}`)
        return NextResponse.json(
          {
            ok: false,
            error: "BACKEND_KEY_MISMATCH",
            message: "Backend authentication failed. Check INTERNAL_API_KEY configuration.",
          },
          { status: 502 }
        )
      }
      
      if (status === 422) {
        // Pass through DATA_GAP errors with full details
        if (backendJson?.error?.code === "DATA_GAP" || backendJson?.ok === false) {
          return NextResponse.json(
            {
              ok: false,
              error: backendJson?.error || {
                code: "VALIDATION_ERROR",
                message: backendJson?.message || "Backend validation failed",
              },
            },
            { status: 422 }
          )
        }
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: backendJson?.error?.message || backendJson?.message || "Backend validation failed",
              details: backendJson?.error?.details || backendJson?.details,
            },
          },
          { status: 422 }
        )
      }
      
      if (status >= 500) {
        console.error(`[${requestId}] Backend server error: ${status}`, backendJson)
        return NextResponse.json(
          {
            ok: false,
            error: "BACKEND_UNAVAILABLE",
            message: backendJson?.error?.message || "Backend server error",
            meta: { requestId, dashboardVersion, elapsedMs },
          },
          { status: 502 }
        )
      }
      
      // Other errors
      return NextResponse.json(
        {
          ok: false,
          error: backendJson?.error?.code || "BACKEND_ERROR",
          message: backendJson?.error?.message || backendJson?.message || "Backend error",
          meta: { requestId, dashboardVersion, elapsedMs },
        },
        { status: backendResponse.status }
      )
    }
    
    // --- 10. Ensure response always has meta, explain, and stats ---
    const tradesCount = backendJson.summary?.entries ?? backendJson.combined?.summary?.entries ?? 0

    // --- 10.5. Retry if no trades (NO_TRIGGER_HITS) with broader settings ---
    const rootCause = backendJson?.explainability?.rootCause
    const isNoTriggerHits = tradesCount === 0 && rootCause === "NO_TRIGGER_HITS"

    const buildFilteredDetectors = (mode: "gate_trigger" | "trigger_only") => {
      const out: string[] = []
      for (const det of detectorsNormalized) {
        const meta = getDetectorById(det)
        const category = meta?.category
        if (mode === "gate_trigger") {
          if (category === "gate" || category === "trigger") out.push(det)
          continue
        }
        if (mode === "trigger_only") {
          if (category === "trigger") out.push(det)
          continue
        }
        out.push(det)
      }
      return out.length > 0 ? out : detectorsNormalized
    }

    const extendRange = (days: number) => {
      if (!applyDemoLimits) {
        const fromDate = new Date(effectiveTo)
        fromDate.setUTCDate(fromDate.getUTCDate() - days)
        return {
          from: fromDate.toISOString().split("T")[0],
          to: effectiveTo,
        }
      }
      // Demo users cannot exceed DEMO_MAX_DAYS
      const limited = limitDateRange(effectiveFrom, effectiveTo, DEMO_MAX_DAYS)
      return { from: limited.from, to: limited.to }
    }

    const runFallback = async (fallbackPayload: typeof backendPayload) => {
      const retryController = new AbortController()
      const retryTimeoutId = setTimeout(() => retryController.abort(), BACKEND_TIMEOUT_MS)
      try {
        const retryResponse = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": INTERNAL_API_KEY,
            "x-request-id": requestId,
          },
          body: JSON.stringify(fallbackPayload),
          signal: retryController.signal,
        })
        clearTimeout(retryTimeoutId)
        const retryText = await retryResponse.text()
        const retryJson = JSON.parse(retryText)
        if (retryResponse.ok) {
          return { ok: true, json: retryJson }
        }
        return { ok: false, json: retryJson }
      } catch {
        clearTimeout(retryTimeoutId)
        return { ok: false, json: null }
      }
    }

    if (isNoTriggerHits) {
      const range90 = extendRange(90)
      const gateTriggerDetectors = buildFilteredDetectors("gate_trigger")
      const fallbackPayloadA = {
        ...backendPayload,
        from: range90.from,
        to: range90.to,
        timeframe: "1h,4h",
        strategy: {
          ...backendPayload.strategy,
          detectors: gateTriggerDetectors,
        },
      }

      const fallbackA = await runFallback(fallbackPayloadA)
      if (fallbackA.ok) {
        backendJson = fallbackA.json
        backendJson.meta = backendJson.meta || {}
        backendJson.meta.warnings = [
          ...(backendJson.meta.warnings || []),
          "No trigger hits. Retried with 1H/4H and fewer confluence detectors.",
        ]
      } else {
        const range120 = extendRange(120)
        const triggerOnlyDetectors = buildFilteredDetectors("trigger_only")
        const fallbackPayloadB = {
          ...backendPayload,
          from: range120.from,
          to: range120.to,
          timeframe: "1h,4h",
          strategy: {
            ...backendPayload.strategy,
            detectors: triggerOnlyDetectors,
          },
        }

        const fallbackB = await runFallback(fallbackPayloadB)
        if (fallbackB.ok) {
          backendJson = fallbackB.json
          backendJson.meta = backendJson.meta || {}
          backendJson.meta.warnings = [
            ...(backendJson.meta.warnings || []),
            "No trigger hits. Retried with triggers only on 1H/4H.",
          ]
        }
      }
    }

    const formatNotice = (input: any) => {
      if (typeof input === "string") return input
      if (input && typeof input === "object") {
        const message = input.message || input.reasonText || input.suggestion || input.rootCause
        return typeof message === "string" ? message : JSON.stringify(input)
      }
      return String(input)
    }
    
    // Always ensure meta block exists with required fields
    if (!backendJson.meta) {
      backendJson.meta = {}
    }
    backendJson.meta.requestId = requestId
    backendJson.meta.dashboardVersion = dashboardVersion
    backendJson.meta.elapsedMs = elapsedMs
    backendJson.meta.detectorsRequested = detectorsRequested
    backendJson.meta.detectorsNormalized = detectorsNormalized
    backendJson.meta.detectorsUnknown = detectorsUnknown
    backendJson.meta.simVersion = backendJson.meta.simVersion || "unknown"
    if (Array.isArray(backendJson.meta.warnings)) {
      backendJson.meta.warnings = backendJson.meta.warnings.map(formatNotice)
    }
    
    // Ensure stats block always exists
    if (!backendJson.stats) {
      const summary = backendJson.summary || {}
      backendJson.stats = {
        trades: summary.entries || 0,
        winrate: summary.winrate || 0,
        tpCount: summary.tp || 0,
        slCount: summary.sl || 0,
        openCount: summary.open || 0,
        timeExitCount: summary.timeExit || 0,
      }
    }
    
    // Add demo mode info if applicable
    if (demoModeUsed) {
      backendJson.demoMode = true
      backendJson.demoMessage = demoMessageUsed
      backendJson.meta.demoMode = true
    }
    
    // Ensure explain/explainability block exists when 0 trades
    if (tradesCount === 0 && !backendJson.explainability) {
      // Build default explain block if backend didn't provide one
      const defaultHitsPerDetector: Record<string, number> = {}
      for (const det of detectorsNormalized) {
        defaultHitsPerDetector[det] = 0
      }
      
      backendJson.explainability = {
        rootCause: "NO_EXPLAIN_FROM_BACKEND",
        explanation: "Backend did not return explainability data. This may indicate a configuration issue.",
        severity: "warning",
        suggestions: [
          "Try extending the date range to 90 days",
          "Try a higher timeframe like 1H or 4H",
          "Check if the selected detectors are compatible",
        ],
        debug: {
          barsScanned: 0,
          hitsPerDetector: defaultHitsPerDetector,
          gateBlocks: {},
          detectorsRequested,
          detectorsNormalized,
          detectorsUnknown,
        }
      }
    }

    if (Array.isArray(backendJson.explainability?.suggestions)) {
      backendJson.explainability.suggestions = backendJson.explainability.suggestions.map(formatNotice)
    }
    
    // --- 11. Store diagnostics for debugging endpoint ---
    try {
      const diagnosticsEntry: SimulatorDiagnostics = {
        timestamp: new Date().toISOString(),
        requestId,
        payload: {
          userId: maskUserId(userId),
          strategyId,
          strategyName: strategy.name || strategyId,
          detectorsCount: detectorsRequested.length,
          detectorsList: detectorsRequested,
          detectorsNormalized,
          symbols: effectiveSymbols,
          from: effectiveFrom,
          to: effectiveTo,
          timeframe: timeframe || "auto",
          demoMode: demoModeUsed,
        },
        response: {
          ok: backendJson.ok,
          entriesTotal: tradesCount,
          winrate: backendJson.summary?.winrate ?? backendJson.combined?.summary?.winrate,
          meta: {
            simVersion: backendJson.meta?.simVersion || "unknown",
            baseTimeframe: backendJson.meta?.baseTimeframe,
            detectorsRequested,
            detectorsNormalized,
            detectorsRecognized: backendJson.meta?.detectorsRecognized,
            detectorsImplemented: backendJson.meta?.detectorsImplemented,
            detectorsNotImplemented: backendJson.meta?.detectorsNotImplemented,
            detectorsUnknown,
            warnings: backendJson.meta?.warnings?.slice(0, 5),
          },
          explainability: backendJson.explainability ? {
            rootCause: backendJson.explainability.rootCause,
            explanation: backendJson.explainability.explanation,
            severity: backendJson.explainability.severity,
            suggestions: backendJson.explainability.suggestions?.slice(0, 3),
            debug: backendJson.explainability.debug ? {
              barsScanned: backendJson.explainability.debug.barsScanned,
              hitsPerDetector: backendJson.explainability.debug.hitsPerDetector,
              gateBlocks: backendJson.explainability.debug.gateBlocks,
            } : undefined,
          } : undefined,
        },
      }
      storeSimulatorDiagnostics(diagnosticsEntry)
    } catch (diagErr) {
      console.error(`[${requestId}] Failed to store diagnostics:`, diagErr)
    }
    
    return NextResponse.json(backendJson)
    
  } catch (err: any) {
    clearTimeout(timeoutId) // Clear timeout in error path
    const elapsedMs = Date.now() - startTime
    
    // Check if it was a timeout abort
    const isTimeout = err?.name === "AbortError"
    const errorCode = isTimeout ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE"
    const errorMessage = isTimeout 
      ? `Backend request timed out after ${BACKEND_TIMEOUT_MS / 1000}s`
      : (err?.message || "Network error")
    
    console.error(`[${requestId}] Backend ${isTimeout ? 'timeout' : 'network error'}:`, errorMessage)
    
    // Store failed diagnostics
    try {
      const diagnosticsEntry: SimulatorDiagnostics = {
        timestamp: new Date().toISOString(),
        requestId,
        payload: {
          userId: maskUserId(userId),
          strategyId,
          strategyName: strategy.name || strategyId,
          detectorsCount: detectorsRequested.length,
          detectorsList: detectorsRequested,
          detectorsNormalized,
          symbols: effectiveSymbols,
          from: effectiveFrom,
          to: effectiveTo,
          timeframe: timeframe || "auto",
          demoMode,
        },
        response: {
          ok: false,
          errorCode,
          errorMessage,
        },
      }
      storeSimulatorDiagnostics(diagnosticsEntry)
    } catch {}
    
    return NextResponse.json(
      {
        ok: false,
        error: errorCode,
        message: errorMessage,
        meta: { 
          requestId, 
          dashboardVersion,
          elapsedMs,
          detectorsRequested,
          detectorsNormalized,
          detectorsUnknown,
        },
        explainability: {
          rootCause: errorCode,
          explanation: isTimeout 
            ? "The simulation request took too long. Try reducing the date range or number of symbols."
            : "Could not connect to the simulation backend. The server may be down or unreachable.",
          severity: "error",
          suggestions: isTimeout
            ? [
              "Reduce the date range (e.g., 7 days instead of 30)",
              "Use fewer symbols",
              "Try the single timeframe mode instead of multi-TF"
            ]
            : [
              "Wait a few minutes and try again",
              "Check if the backend service is running",
              "Contact support if the issue persists"
            ],
        }
      },
      { status: isTimeout ? 504 : 502 }
    )
  }
}
