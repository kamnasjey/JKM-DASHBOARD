/**
 * Detector Normalization Utilities
 * 
 * Shared utilities for normalizing detector IDs across the dashboard.
 * This ensures consistency between UI, API, and storage.
 * 
 * IMPORTANT: BREAKOUT_RETEST_ENTRY is consolidated into BREAK_RETEST
 */

// Alias mapping for duplicate/legacy detectors
const DETECTOR_ALIASES: Record<string, string> = {
  // Duplicate detector - BREAKOUT_RETEST_ENTRY removed, aliased to BREAK_RETEST
  "breakout_retest_entry": "BREAK_RETEST",
  "breakout-retest-entry": "BREAK_RETEST",
  "BREAKOUT_RETEST_ENTRY": "BREAK_RETEST",
  
  // Common naming variations
  "eq-break": "EQ_BREAK",
  "eq_break": "EQ_BREAK",
  "break-of-structure": "BOS",
  "break_of_structure": "BOS",
  "fair-value-gap": "FVG",
  "fair_value_gap": "FVG",
  "order-block": "OB",
  "order_block": "OB",
  "change-of-character": "CHOCH",
  "change_of_character": "CHOCH",
  "liquidity-sweep": "SWEEP",
  "liquidity_sweep": "SWEEP",
  "swing-failure": "SFP",
  "swing_failure": "SFP",
  "break-retest": "BREAK_RETEST",
  "break_retest": "BREAK_RETEST",
}

/**
 * Normalize a detector ID to canonical backend format.
 * 
 * Normalization steps:
 * 1. Trim whitespace
 * 2. Replace hyphens/spaces/dots with underscores  
 * 3. Check alias mapping
 * 4. Return uppercase canonical form
 * 
 * Examples:
 *   "breakout-retest-entry" -> "BREAK_RETEST"
 *   "Break Retest" -> "BREAK_RETEST"
 *   "bos" -> "BOS"
 *   "GATE_REGIME" -> "GATE_REGIME"
 */
export function normalizeDetectorId(raw: string): string {
  if (!raw) return ""
  
  // Step 1: Trim and replace separators
  const normalized = raw.trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\./g, "_")
  
  // Step 2: Check alias mapping (case-insensitive)
  const lower = normalized.toLowerCase()
  if (DETECTOR_ALIASES[lower]) {
    return DETECTOR_ALIASES[lower]
  }
  
  // Check uppercase alias too
  const upper = normalized.toUpperCase()
  if (DETECTOR_ALIASES[upper]) {
    return DETECTOR_ALIASES[upper]
  }
  
  // Step 3: Return uppercase
  return upper
}

/**
 * Normalize a list of detector IDs and remove duplicates.
 * 
 * After normalization, BREAKOUT_RETEST_ENTRY becomes BREAK_RETEST,
 * so if both are present, only BREAK_RETEST will be in the result.
 * 
 * @param detectors - Array of raw detector IDs
 * @returns Array of unique canonical detector IDs
 */
export function normalizeDetectorList(detectors: string[]): string[] {
  if (!Array.isArray(detectors)) return []
  
  const seen = new Set<string>()
  const result: string[] = []
  
  for (const det of detectors) {
    if (typeof det !== "string") continue
    
    const canonical = normalizeDetectorId(det)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      result.push(canonical)
    }
  }
  
  return result
}

/**
 * Canonical detector IDs (31 total after duplicate removal)
 */
export const CANONICAL_DETECTOR_IDS = new Set([
  // Gates (3)
  "GATE_REGIME",
  "GATE_VOLATILITY", 
  "GATE_DRIFT_SENTINEL",
  // Triggers (15)
  "BOS",
  "FVG",
  "OB",
  "CHOCH",
  "EQ_BREAK",
  "SWEEP",
  "IMBALANCE",
  "SFP",
  "BREAK_RETEST",
  "COMPRESSION_EXPANSION",
  "MOMENTUM_CONTINUATION",
  "MEAN_REVERSION_SNAPBACK",
  "SR_BOUNCE",
  "SR_BREAK_CLOSE",
  "TRIANGLE_BREAKOUT_CLOSE",
  // Confluence (13)
  "DOJI",
  "DOUBLE_TOP_BOTTOM",
  "ENGULF_AT_LEVEL",
  "FAKEOUT_TRAP",
  "FIBO_EXTENSION",
  "FIBO_RETRACE_CONFLUENCE",
  "FLAG_PENNANT",
  "HEAD_SHOULDERS",
  "PINBAR_AT_LEVEL",
  "PRICE_MOMENTUM_WEAKENING",
  "RECTANGLE_RANGE_EDGE",
  "SR_ROLE_REVERSAL",
  "TREND_FIBO",
])

/**
 * Check if a detector ID is valid (after normalization)
 */
export function isValidDetector(detectorId: string): boolean {
  const canonical = normalizeDetectorId(detectorId)
  return CANONICAL_DETECTOR_IDS.has(canonical)
}
