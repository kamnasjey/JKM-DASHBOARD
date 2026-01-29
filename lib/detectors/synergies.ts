/**
 * Detector Synergies - Compatibility and Recommendation System
 *
 * Defines which detectors work well together and which ones conflict.
 * Used by Strategy Wizard and Detector Select to show recommendations.
 */

export interface DetectorSynergy {
  /** First detector in the pair */
  detectorA: string
  /** Second detector in the pair */
  detectorB: string
  /** Synergy score (0-100) - higher = better combination */
  synergyScore: number
  /** Why these work well together */
  reason?: string
  /** Is this a popular/common combination */
  isPopular?: boolean
}

export interface DetectorConflict {
  /** First detector in the conflict */
  detectorA: string
  /** Second detector in the conflict */
  detectorB: string
  /** Why these don't work well together */
  reason: string
  /** Severity: warning = can use but suboptimal, error = avoid */
  severity: "warning" | "error"
}

// ============================================================
// High Synergy Pairs (work very well together)
// ============================================================

export const DETECTOR_SYNERGIES: DetectorSynergy[] = [
  // Trend combinations
  {
    detectorA: "BOS",
    detectorB: "FVG",
    synergyScore: 90,
    reason: "BOS confirms structure, FVG provides entry zone",
    isPopular: true,
  },
  {
    detectorA: "BOS",
    detectorB: "FLAG_PENNANT",
    synergyScore: 85,
    reason: "Both confirm trend continuation",
    isPopular: true,
  },
  {
    detectorA: "BOS",
    detectorB: "TREND_FIBO",
    synergyScore: 80,
    reason: "Structure break + Fibonacci confluence",
  },
  {
    detectorA: "FVG",
    detectorB: "OB",
    synergyScore: 88,
    reason: "Order block with fair value gap = high probability zone",
    isPopular: true,
  },
  {
    detectorA: "MOMENTUM_CONTINUATION",
    detectorB: "FLAG_PENNANT",
    synergyScore: 82,
    reason: "Pattern confirms momentum continuation",
  },

  // Reversal combinations
  {
    detectorA: "SWEEP",
    detectorB: "SFP",
    synergyScore: 92,
    reason: "Both indicate liquidity grab reversal",
    isPopular: true,
  },
  {
    detectorA: "SWEEP",
    detectorB: "PINBAR_AT_LEVEL",
    synergyScore: 85,
    reason: "Sweep with rejection candle = strong reversal",
  },
  {
    detectorA: "SFP",
    detectorB: "ENGULF_AT_LEVEL",
    synergyScore: 83,
    reason: "Swing failure with engulfing confirmation",
  },
  {
    detectorA: "CHOCH",
    detectorB: "PINBAR_AT_LEVEL",
    synergyScore: 80,
    reason: "Structure change with price action confirmation",
  },
  {
    detectorA: "DOUBLE_TOP_BOTTOM",
    detectorB: "PRICE_MOMENTUM_WEAKENING",
    synergyScore: 78,
    reason: "Pattern with divergence = higher probability",
  },

  // Breakout combinations
  {
    detectorA: "BREAK_RETEST",
    detectorB: "SR_ROLE_REVERSAL",
    synergyScore: 90,
    reason: "Breakout with polarity flip confirmation",
    isPopular: true,
  },
  {
    detectorA: "SR_BREAK_CLOSE",
    detectorB: "COMPRESSION_EXPANSION",
    synergyScore: 85,
    reason: "S/R break after volatility compression",
  },
  {
    detectorA: "TRIANGLE_BREAKOUT_CLOSE",
    detectorB: "FLAG_PENNANT",
    synergyScore: 80,
    reason: "Both are continuation patterns",
  },
  {
    detectorA: "BREAK_RETEST",
    detectorB: "FIBO_RETRACE_CONFLUENCE",
    synergyScore: 82,
    reason: "Retest at Fibonacci level = strong entry",
  },

  // S/R combinations
  {
    detectorA: "SR_BOUNCE",
    detectorB: "PINBAR_AT_LEVEL",
    synergyScore: 88,
    reason: "S/R bounce with price action confirmation",
    isPopular: true,
  },
  {
    detectorA: "SR_BOUNCE",
    detectorB: "ENGULF_AT_LEVEL",
    synergyScore: 85,
    reason: "S/R bounce with engulfing candle",
  },
  {
    detectorA: "SR_BOUNCE",
    detectorB: "RECTANGLE_RANGE_EDGE",
    synergyScore: 80,
    reason: "Range edge bounce setup",
  },

  // Institutional combinations
  {
    detectorA: "OB",
    detectorB: "IMBALANCE",
    synergyScore: 87,
    reason: "Order block + imbalance = institutional zone",
    isPopular: true,
  },
  {
    detectorA: "OB",
    detectorB: "PINBAR_AT_LEVEL",
    synergyScore: 84,
    reason: "Order block with rejection confirmation",
  },
  {
    detectorA: "FVG",
    detectorB: "FIBO_RETRACE_CONFLUENCE",
    synergyScore: 82,
    reason: "Gap at Fibonacci level",
  },
  {
    detectorA: "EQ_BREAK",
    detectorB: "FVG",
    synergyScore: 80,
    reason: "Equilibrium break through fair value gap",
  },

  // Gate synergies
  {
    detectorA: "GATE_REGIME",
    detectorB: "GATE_VOLATILITY",
    synergyScore: 75,
    reason: "Both filter market conditions",
  },
  {
    detectorA: "GATE_REGIME",
    detectorB: "GATE_DRIFT_SENTINEL",
    synergyScore: 78,
    reason: "Regime + momentum alignment",
  },

  // Confluence synergies
  {
    detectorA: "FIBO_RETRACE_CONFLUENCE",
    detectorB: "TREND_FIBO",
    synergyScore: 85,
    reason: "Multiple Fibonacci confirmation",
  },
  {
    detectorA: "FIBO_RETRACE_CONFLUENCE",
    detectorB: "SR_ROLE_REVERSAL",
    synergyScore: 82,
    reason: "Fibonacci + S/R confluence",
  },
]

// ============================================================
// Detector Conflicts (don't work well together)
// ============================================================

export const DETECTOR_CONFLICTS: DetectorConflict[] = [
  // Trend vs Counter-trend
  {
    detectorA: "BOS",
    detectorB: "MEAN_REVERSION_SNAPBACK",
    reason: "BOS is trend-following, Mean Reversion is counter-trend",
    severity: "warning",
  },
  {
    detectorA: "MOMENTUM_CONTINUATION",
    detectorB: "SFP",
    reason: "Momentum continuation vs reversal pattern",
    severity: "warning",
  },
  {
    detectorA: "EQ_BREAK",
    detectorB: "MEAN_REVERSION_SNAPBACK",
    reason: "Equilibrium break is trend, snapback is counter-trend",
    severity: "warning",
  },

  // Breakout vs Bounce
  {
    detectorA: "SR_BREAK_CLOSE",
    detectorB: "SR_BOUNCE",
    reason: "Break expects continuation, bounce expects rejection",
    severity: "error",
  },
  {
    detectorA: "BREAK_RETEST",
    detectorB: "MEAN_REVERSION_SNAPBACK",
    reason: "Breakout vs mean reversion approach",
    severity: "warning",
  },

  // Conflicting patterns
  {
    detectorA: "FLAG_PENNANT",
    detectorB: "DOUBLE_TOP_BOTTOM",
    reason: "Continuation vs reversal pattern",
    severity: "warning",
  },
  {
    detectorA: "TRIANGLE_BREAKOUT_CLOSE",
    detectorB: "RECTANGLE_RANGE_EDGE",
    reason: "Breakout vs range-bound approach",
    severity: "warning",
  },
]

// ============================================================
// Lookup Functions
// ============================================================

/**
 * Get synergy score between two detectors
 * Returns 0 if no specific synergy defined
 */
export function getSynergyScore(detectorA: string, detectorB: string): number {
  const synergy = DETECTOR_SYNERGIES.find(
    s =>
      (s.detectorA === detectorA && s.detectorB === detectorB) ||
      (s.detectorA === detectorB && s.detectorB === detectorA)
  )
  return synergy?.synergyScore ?? 0
}

/**
 * Get synergy info between two detectors
 */
export function getSynergyInfo(detectorA: string, detectorB: string): DetectorSynergy | null {
  return DETECTOR_SYNERGIES.find(
    s =>
      (s.detectorA === detectorA && s.detectorB === detectorB) ||
      (s.detectorA === detectorB && s.detectorB === detectorA)
  ) ?? null
}

/**
 * Get conflict info between two detectors
 */
export function getConflictInfo(detectorA: string, detectorB: string): DetectorConflict | null {
  return DETECTOR_CONFLICTS.find(
    c =>
      (c.detectorA === detectorA && c.detectorB === detectorB) ||
      (c.detectorA === detectorB && c.detectorB === detectorA)
  ) ?? null
}

/**
 * Get all detectors that have high synergy with the given detector
 */
export function getHighSynergyDetectors(detectorId: string, minScore = 75): string[] {
  const synergies = DETECTOR_SYNERGIES.filter(
    s =>
      s.synergyScore >= minScore &&
      (s.detectorA === detectorId || s.detectorB === detectorId)
  )

  return synergies.map(s =>
    s.detectorA === detectorId ? s.detectorB : s.detectorA
  )
}

/**
 * Get all detectors that conflict with the given detector
 */
export function getConflictingDetectors(detectorId: string): string[] {
  const conflicts = DETECTOR_CONFLICTS.filter(
    c => c.detectorA === detectorId || c.detectorB === detectorId
  )

  return conflicts.map(c =>
    c.detectorA === detectorId ? c.detectorB : c.detectorA
  )
}

/**
 * Get popular combinations that include the given detector
 */
export function getPopularCombinations(detectorId: string): DetectorSynergy[] {
  return DETECTOR_SYNERGIES.filter(
    s =>
      s.isPopular &&
      (s.detectorA === detectorId || s.detectorB === detectorId)
  )
}

/**
 * Check all conflicts for a set of selected detectors
 * Returns array of conflict warnings
 */
export function checkConflicts(selectedDetectors: string[]): Array<{
  detectorA: string
  detectorB: string
  reason: string
  severity: "warning" | "error"
}> {
  const conflicts: Array<{
    detectorA: string
    detectorB: string
    reason: string
    severity: "warning" | "error"
  }> = []

  for (let i = 0; i < selectedDetectors.length; i++) {
    for (let j = i + 1; j < selectedDetectors.length; j++) {
      const conflict = getConflictInfo(selectedDetectors[i], selectedDetectors[j])
      if (conflict) {
        conflicts.push({
          detectorA: conflict.detectorA,
          detectorB: conflict.detectorB,
          reason: conflict.reason,
          severity: conflict.severity,
        })
      }
    }
  }

  return conflicts
}

/**
 * Calculate overall synergy score for a combination
 * Higher score = better combination
 */
export function calculateCombinationScore(selectedDetectors: string[]): {
  score: number
  maxPossible: number
  percentage: number
  synergies: number
  conflicts: number
} {
  let totalSynergy = 0
  let synergyCount = 0
  let conflictCount = 0

  // Check all pairs
  for (let i = 0; i < selectedDetectors.length; i++) {
    for (let j = i + 1; j < selectedDetectors.length; j++) {
      const synergy = getSynergyScore(selectedDetectors[i], selectedDetectors[j])
      if (synergy > 0) {
        totalSynergy += synergy
        synergyCount++
      }

      const conflict = getConflictInfo(selectedDetectors[i], selectedDetectors[j])
      if (conflict) {
        conflictCount++
        // Penalties
        if (conflict.severity === "error") {
          totalSynergy -= 30
        } else {
          totalSynergy -= 15
        }
      }
    }
  }

  // Calculate possible pairs
  const pairs = (selectedDetectors.length * (selectedDetectors.length - 1)) / 2
  const maxPossible = pairs * 100

  return {
    score: Math.max(0, totalSynergy),
    maxPossible,
    percentage: maxPossible > 0 ? Math.round((Math.max(0, totalSynergy) / maxPossible) * 100) : 0,
    synergies: synergyCount,
    conflicts: conflictCount,
  }
}

/**
 * Suggest additional detectors that would improve the combination
 */
export function suggestDetectors(
  currentSelection: string[],
  limit = 3
): Array<{
  detectorId: string
  reason: string
  avgSynergy: number
}> {
  // Track potential additions
  const suggestions: Map<string, { reasons: string[]; totalSynergy: number; count: number }> = new Map()

  for (const detector of currentSelection) {
    const highSynergy = DETECTOR_SYNERGIES.filter(
      s =>
        s.synergyScore >= 75 &&
        (s.detectorA === detector || s.detectorB === detector)
    )

    for (const synergy of highSynergy) {
      const partnerId = synergy.detectorA === detector ? synergy.detectorB : synergy.detectorA

      // Skip if already selected
      if (currentSelection.includes(partnerId)) continue

      // Check for conflicts with current selection
      const hasConflict = currentSelection.some(
        sel => getConflictInfo(sel, partnerId) !== null
      )
      if (hasConflict) continue

      // Track suggestion
      const existing = suggestions.get(partnerId) ?? { reasons: [], totalSynergy: 0, count: 0 }
      if (synergy.reason) {
        existing.reasons.push(`${synergy.reason} (with ${detector})`)
      }
      existing.totalSynergy += synergy.synergyScore
      existing.count++
      suggestions.set(partnerId, existing)
    }
  }

  // Sort by average synergy and return top suggestions
  return Array.from(suggestions.entries())
    .map(([detectorId, data]) => ({
      detectorId,
      reason: data.reasons[0] ?? "Good synergy with selected detectors",
      avgSynergy: Math.round(data.totalSynergy / data.count),
    }))
    .sort((a, b) => b.avgSynergy - a.avgSynergy)
    .slice(0, limit)
}
