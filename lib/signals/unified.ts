/**
 * Unified Signal Type and Mappers
 * 
 * Merges scanner results (setup found) and old signals into ONE canonical shape.
 * Used by /signals page to display both sources uniformly.
 */

import type { SignalPayloadPublicV1 } from "@/lib/types"

// ============================================================
// Canonical Unified Signal Shape
// ============================================================

export interface UnifiedSignal {
  /** Unique ID (scanner: strategyId:symbol:tf:ts, signals: signal_id) */
  id: string
  /** Source of the signal */
  source: "scanner" | "signals"
  /** ISO timestamp */
  ts: string
  /** Symbol (e.g., BTCUSDT, EURUSD) */
  symbol: string
  /** Timeframe (e.g., 15m, 1h, 4h) */
  timeframe: string
  /** Strategy ID if from scanner */
  strategyId?: string
  /** Strategy name for display */
  strategyName?: string
  /** Direction: long/short/neutral */
  direction?: "long" | "short" | "neutral"
  /** Risk/Reward ratio */
  rr?: number
  /** Confidence score (0-1) */
  confidence?: number
  /** Entry price if available */
  entry?: number
  /** Stop loss price */
  sl?: number
  /** Take profit price */
  tp?: number
  /** Status for old signals */
  status?: "OK" | "NONE" | "FOUND" | "ACTIVE" | "CLOSED"
  /** Note or summary */
  note?: string
  /** Root cause for no-setup or warnings */
  rootCause?: string
  /** Data coverage metrics */
  dataCoverage?: {
    missingPct?: number
    barsScanned?: number
  }
  /** Detector information */
  detectors?: {
    normalized?: string[]
    unknown?: string[]
    hitsPerDetector?: Record<string, number>
  }
  /** Gates passed/blocked */
  gatesPassed?: boolean
  gateBlocks?: string[]
  /** Trigger/confluence hits */
  triggersHit?: number
  confluenceHit?: number
  /** Outcome tracking */
  outcome?: "win" | "loss" | "expired" | "pending"
  /** Entry taken by user */
  entry_taken?: boolean | null
  /** Full explain payload if available */
  explain?: Record<string, any>
  /** Actionable links */
  links?: {
    openSimulator?: string
  }
}

// ============================================================
// Scanner Result Type (from backend)
// ============================================================

export interface ScannerResult {
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
  dataCoverage?: Record<string, any>
  explain?: Record<string, any>
}

// ============================================================
// Mappers
// ============================================================

/**
 * Safely parse a date, returning null if invalid
 */
function safeParseDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Map scanner result to UnifiedSignal
 */
export function mapScannerResultToUnified(item: ScannerResult): UnifiedSignal {
  // Generate stable ID from key fields
  const id = `scanner:${item.strategyId}:${item.symbol}:${item.tf}:${item.ts}`

  // Map bias to direction
  let direction: "long" | "short" | "neutral" = "neutral"
  if (item.bias === "bullish" || item.bias === "long") direction = "long"
  if (item.bias === "bearish" || item.bias === "short") direction = "short"

  // Build simulator link (safely handle invalid dates)
  let simulatorLink: string | undefined
  const to = safeParseDate(item.ts)
  if (to) {
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days back
    simulatorLink = `/simulator?symbol=${encodeURIComponent(item.symbol)}&tf=${encodeURIComponent(item.tf)}&strategyId=${encodeURIComponent(item.strategyId)}&from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}`
  }

  return {
    id,
    source: "scanner",
    ts: item.ts,
    symbol: item.symbol,
    timeframe: item.tf,
    strategyId: item.strategyId,
    strategyName: item.strategyName || undefined,
    direction,
    rr: item.rr,
    confidence: item.confidence,
    gatesPassed: item.gatesPassed,
    gateBlocks: item.gateBlocks,
    triggersHit: item.triggersHit,
    confluenceHit: item.confluenceHit,
    dataCoverage: item.dataCoverage ? {
      missingPct: item.dataCoverage.missingPct,
      barsScanned: item.barsScanned || item.dataCoverage.actualBars,
    } : undefined,
    detectors: {
      normalized: item.detectorsNormalized,
      unknown: [],
      hitsPerDetector: item.hitsPerDetector,
    },
    explain: item.explain,
    links: simulatorLink ? { openSimulator: simulatorLink } : undefined,
  }
}

/**
 * Map old signal (SignalPayloadPublicV1) to UnifiedSignal
 * Note: Also handles StoredSignal format which uses signal_key instead of signal_id
 */
export function mapOldSignalToUnified(item: SignalPayloadPublicV1): UnifiedSignal {
  // Handle both signal_id (API format) and signal_key (Firestore format)
  const signalId = item.signal_id || (item as any).signal_key || "unknown"
  const id = `signals:${signalId}`

  // Map direction
  let direction: "long" | "short" | "neutral" = "neutral"
  if (item.direction === "BUY" || item.direction === "bullish" || item.direction === "long") {
    direction = "long"
  }
  if (item.direction === "SELL" || item.direction === "bearish" || item.direction === "short") {
    direction = "short"
  }

  // Convert epoch to ISO (fallback if ts not provided)
  // Priority: ts > generated_at > createdAt > created_at (epoch) > now
  let ts = item.ts
  if (!ts && (item as any).generated_at) {
    ts = (item as any).generated_at
  }
  if (!ts && (item as any).createdAt) {
    ts = (item as any).createdAt
  }
  if (!ts && item.created_at) {
    const parsed = safeParseDate(item.created_at * 1000)
    ts = parsed ? parsed.toISOString() : new Date().toISOString()
  }
  if (!ts) {
    ts = new Date().toISOString()
  }

  // Build simulator link if possible (safely handle invalid dates)
  let simulatorLink: string | undefined
  const tf = item.timeframe || item.tf
  const toDate = safeParseDate(ts)
  if (item.symbol && tf && toDate) {
    const from = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000)
    simulatorLink = `/simulator?symbol=${encodeURIComponent(item.symbol)}&tf=${encodeURIComponent(tf)}&from=${from.toISOString().split("T")[0]}&to=${toDate.toISOString().split("T")[0]}`
  }

  // Extract fail reasons as note
  const note = item.fail_reasons?.length
    ? `Fail: ${item.fail_reasons.join(", ")}`
    : undefined

  const outcome = item.outcome
    ? String(item.outcome).toLowerCase()
    : undefined

  // Get strategy ID from multiple possible locations
  const strategyId = item.strategy_id || item.explain?.strategy_id || (item as any).strategyId
  const strategyName = item.strategy_name || item.explain?.strategy_name || (item as any).strategyName

  return {
    id,
    source: "signals",
    ts,
    symbol: item.symbol,
    timeframe: tf || "—",
    strategyId,
    strategyName,
    direction,
    rr: item.rr,
    confidence: item.confidence,
    entry: item.entry,
    sl: item.sl,
    tp: item.tp,
    status: item.status,
    outcome: outcome as UnifiedSignal["outcome"],
    note,
    dataCoverage: item.explain?.dataCoverage
      ? {
        missingPct: item.explain?.dataCoverage?.missingPct ?? item.explain?.dataCoverage?.pct,
        barsScanned: item.explain?.dataCoverage?.barsScanned ?? item.explain?.dataCoverage?.rows,
      }
      : undefined,
    detectors: item.detectors_normalized || item.hits_per_detector
      ? {
        normalized: item.detectors_normalized,
        unknown: [],
        hitsPerDetector: item.hits_per_detector,
      }
      : undefined,
    explain: item.explain,
    links: simulatorLink ? { openSimulator: simulatorLink } : undefined,
    entry_taken: item.entry_taken ?? item.user_tracking?.entry_taken,
  }
}

// ============================================================
// Merge and Dedupe
// ============================================================

/**
 * Create a dedup key for a signal
 * Uses strategyId+symbol+timeframe+ts_bucket (minute precision)
 */
function getDedupeKey(signal: UnifiedSignal): string {
  const tsBucket = signal.ts.slice(0, 16) // "2026-01-17T10:30" (minute bucket)
  const strategyPart = signal.strategyId || "none"
  return `${strategyPart}:${signal.symbol}:${signal.timeframe}:${tsBucket}`
}

/**
 * Merge scanner results and old signals into unified list
 * - Dedupes by key (prefers scanner over old signals)
 * - Sorts by ts descending (newest first)
 */
export function mergeSignals(
  scannerResults: UnifiedSignal[],
  oldSignals: UnifiedSignal[]
): UnifiedSignal[] {
  // Combine all signals
  const all = [...scannerResults, ...oldSignals]

  // Sort by ts descending (Newest first), with fallback for invalid dates
  all.sort((a, b) => {
    const ta = safeParseDate(a.ts)?.getTime() ?? 0
    const tb = safeParseDate(b.ts)?.getTime() ?? 0
    return tb - ta
  })

  // Dedup with 60-minute sliding window per Symbol+Direction
  const deduped: UnifiedSignal[] = []

  for (const signal of all) {
    const ts = safeParseDate(signal.ts)?.getTime() ?? 0

    // Check if we already have a similar signal within 60 minutes
    const duplicate = deduped.find(d => {
      // Must match Symbol and Direction
      if (d.symbol !== signal.symbol) return false

      // Normalize direction/side comparison
      const dDir = (d.direction || "").toLowerCase()
      const sDir = (signal.direction || "").toLowerCase()
      if (dDir !== sDir) return false

      // Check time difference (60 minutes = 3600000 ms)
      const dTs = safeParseDate(d.ts)?.getTime() ?? 0
      return ts > 0 && dTs > 0 && Math.abs(dTs - ts) < 3600000
    })

    // If no duplicate found (or if this is the first/newest), keep it
    if (!duplicate) {
      deduped.push(signal)
    }
  }

  return deduped
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if data coverage is concerning (high missing percentage)
 */
export function hasLowCoverage(signal: UnifiedSignal, threshold = 30): boolean {
  return (signal.dataCoverage?.missingPct ?? 0) > threshold
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence?: number): "high" | "medium" | "low" | "unknown" {
  if (confidence === undefined || confidence === null) return "unknown"
  if (confidence >= 0.7) return "high"
  if (confidence >= 0.5) return "medium"
  return "low"
}

/**
 * Format direction for display
 */
export function formatDirection(direction?: string): string {
  if (direction === "long") return "LONG"
  if (direction === "short") return "SHORT"
  return "—"
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ts
  }
}
