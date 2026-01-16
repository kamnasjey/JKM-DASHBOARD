/**
 * Simulator Diagnostics - In-memory store for last simulator request/response
 * 
 * This is used to provide a diagnostics endpoint that users can check
 * without opening DevTools. Stores sanitized (no secrets) payload and response.
 */

export interface SimulatorDiagnostics {
  timestamp: string
  requestId: string
  // Sanitized payload (no secrets)
  payload: {
    userId: string  // Masked
    strategyId: string
    strategyName: string
    detectorsCount: number
    detectorsList: string[]
    symbols: string[]
    from: string
    to: string
    timeframe: string
    demoMode: boolean
  }
  // Response meta (no trade data for privacy)
  response: {
    ok: boolean
    entriesTotal?: number
    winrate?: number
    meta?: {
      simVersion?: string
      baseTimeframe?: string
      detectorsRequested?: string[]
      detectorsNormalized?: string[]  // NEW: canonical IDs
      detectorsRecognized?: string[]
      detectorsImplemented?: string[]
      detectorsNotImplemented?: string[]
      detectorsUnknown?: string[]
      warnings?: string[]
    }
    explainability?: {
      rootCause?: string
      explanation?: string
      severity?: string
      suggestions?: string[]
      debug?: {
        barsScanned?: number
        hitsPerDetector?: Record<string, number>
        gateBlocks?: Record<string, number>
      }
    }
    errorCode?: string
    errorMessage?: string
  }
}

// In-memory store for last N diagnostics (ring buffer)
const MAX_STORED = 5
let diagnosticsStore: SimulatorDiagnostics[] = []

/**
 * Store a new diagnostics entry (called after each simulator run)
 */
export function storeSimulatorDiagnostics(entry: SimulatorDiagnostics): void {
  diagnosticsStore.push(entry)
  // Keep only last N entries
  if (diagnosticsStore.length > MAX_STORED) {
    diagnosticsStore = diagnosticsStore.slice(-MAX_STORED)
  }
}

/**
 * Get the last diagnostics entry
 */
export function getLastDiagnostics(): SimulatorDiagnostics | null {
  return diagnosticsStore.length > 0 
    ? diagnosticsStore[diagnosticsStore.length - 1] 
    : null
}

/**
 * Get all stored diagnostics entries
 */
export function getAllDiagnostics(): SimulatorDiagnostics[] {
  return [...diagnosticsStore]
}

/**
 * Mask a user ID for privacy (show first 4 and last 4 chars)
 */
export function maskUserId(userId: string): string {
  if (!userId || userId.length <= 8) return "****"
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`
}
