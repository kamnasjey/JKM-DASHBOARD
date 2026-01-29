/**
 * Essential Detectors - Simple Mode Selection
 *
 * Defines a curated subset of detectors for beginners.
 * Used by "Simple Mode" toggle in detector select.
 *
 * Total: 14 essential (vs 31 full catalog)
 */

export const ESSENTIAL_DETECTORS = {
  /**
   * Essential Gate Detectors (2/3)
   * Core market condition filters
   */
  gate: [
    "GATE_REGIME",      // Required - market regime filter
    "GATE_VOLATILITY",  // ATR-based volatility filter
    // GATE_DRIFT_SENTINEL - Advanced (omitted)
  ],

  /**
   * Essential Trigger Detectors (8/15)
   * Most common entry patterns
   */
  trigger: [
    "BOS",              // Break of Structure - trend
    "FVG",              // Fair Value Gap - institutional
    "OB",               // Order Block - institutional
    "CHOCH",            // Change of Character - reversal
    "SWEEP",            // Liquidity Sweep - reversal
    "BREAK_RETEST",     // Classic breakout pattern
    "SR_BOUNCE",        // Support/Resistance bounce
    "SFP",              // Swing Failure Pattern
    // Omitted (advanced):
    // - EQ_BREAK
    // - IMBALANCE (similar to FVG)
    // - COMPRESSION_EXPANSION
    // - MOMENTUM_CONTINUATION
    // - MEAN_REVERSION_SNAPBACK
    // - SR_BREAK_CLOSE (similar to BREAK_RETEST)
    // - TRIANGLE_BREAKOUT_CLOSE
  ],

  /**
   * Essential Confluence Detectors (4/13)
   * Most impactful confirmations
   */
  confluence: [
    "PINBAR_AT_LEVEL",           // Rejection candle
    "ENGULF_AT_LEVEL",           // Engulfing candle
    "FIBO_RETRACE_CONFLUENCE",   // Fibonacci zones
    "SR_ROLE_REVERSAL",          // Polarity flip
    // Omitted (less critical or advanced):
    // - DOJI
    // - DOUBLE_TOP_BOTTOM
    // - FAKEOUT_TRAP
    // - FIBO_EXTENSION
    // - FLAG_PENNANT
    // - HEAD_SHOULDERS
    // - PRICE_MOMENTUM_WEAKENING
    // - RECTANGLE_RANGE_EDGE
    // - TREND_FIBO
  ],
} as const

/**
 * All essential detector IDs in a flat array
 */
export const ESSENTIAL_DETECTOR_IDS: string[] = [
  ...ESSENTIAL_DETECTORS.gate,
  ...ESSENTIAL_DETECTORS.trigger,
  ...ESSENTIAL_DETECTORS.confluence,
]

/**
 * Set for O(1) lookup
 */
export const ESSENTIAL_DETECTOR_SET = new Set(ESSENTIAL_DETECTOR_IDS)

/**
 * Check if a detector is essential (simple mode)
 */
export function isEssentialDetector(detectorId: string): boolean {
  return ESSENTIAL_DETECTOR_SET.has(detectorId)
}

/**
 * Count of essential detectors by category
 */
export const ESSENTIAL_COUNTS = {
  gate: ESSENTIAL_DETECTORS.gate.length,           // 2
  trigger: ESSENTIAL_DETECTORS.trigger.length,     // 8
  confluence: ESSENTIAL_DETECTORS.confluence.length, // 4
  total: ESSENTIAL_DETECTOR_IDS.length,            // 14
}

/**
 * Advanced (non-essential) detector IDs
 * These are hidden in Simple Mode
 */
export const ADVANCED_DETECTORS = {
  gate: [
    "GATE_DRIFT_SENTINEL",
  ],
  trigger: [
    "EQ_BREAK",
    "IMBALANCE",
    "COMPRESSION_EXPANSION",
    "MOMENTUM_CONTINUATION",
    "MEAN_REVERSION_SNAPBACK",
    "SR_BREAK_CLOSE",
    "TRIANGLE_BREAKOUT_CLOSE",
  ],
  confluence: [
    "DOJI",
    "DOUBLE_TOP_BOTTOM",
    "FAKEOUT_TRAP",
    "FIBO_EXTENSION",
    "FLAG_PENNANT",
    "HEAD_SHOULDERS",
    "PRICE_MOMENTUM_WEAKENING",
    "RECTANGLE_RANGE_EDGE",
    "TREND_FIBO",
  ],
} as const

export const ADVANCED_DETECTOR_IDS: string[] = [
  ...ADVANCED_DETECTORS.gate,
  ...ADVANCED_DETECTORS.trigger,
  ...ADVANCED_DETECTORS.confluence,
]

export const ADVANCED_DETECTOR_SET = new Set(ADVANCED_DETECTOR_IDS)

/**
 * Check if a detector is advanced (hidden in simple mode)
 */
export function isAdvancedDetector(detectorId: string): boolean {
  return ADVANCED_DETECTOR_SET.has(detectorId)
}

/**
 * Filter detector list to essential only
 */
export function filterToEssential<T extends { id: string }>(detectors: T[]): T[] {
  return detectors.filter(d => ESSENTIAL_DETECTOR_SET.has(d.id))
}

/**
 * Filter detector list to advanced only
 */
export function filterToAdvanced<T extends { id: string }>(detectors: T[]): T[] {
  return detectors.filter(d => ADVANCED_DETECTOR_SET.has(d.id))
}

/**
 * Explanation for Simple Mode
 */
export const SIMPLE_MODE_INFO = {
  titleEn: "Simple Mode",
  titleMn: "Энгийн горим",
  descEn: "Shows 14 essential detectors curated for beginners. Toggle off for full 31 detectors.",
  descMn: "Эхлэгчдэд зориулсан 14 үндсэн detector харуулна. Унтраавал бүх 31 detector харагдана.",
}
