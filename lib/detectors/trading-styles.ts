/**
 * Trading Styles - Strategy Building Guide
 *
 * Defines trading styles with recommended detector combinations.
 * Used by Strategy Wizard to suggest detectors based on user's trading style.
 */

export type TradingStyle = "trend" | "reversal" | "breakout" | "range" | "institutional"

export interface RecommendedSettings {
  /** Minimum Risk/Reward ratio */
  minRR: number
  /** Best performing symbols */
  symbols: string[]
  /** Best performing timeframes */
  timeframes: string[]
}

export interface TradingStyleMeta {
  /** Unique style identifier */
  id: TradingStyle
  /** English label */
  labelEn: string
  /** Mongolian label */
  labelMn: string
  /** English description */
  descEn: string
  /** Mongolian description */
  descMn: string
  /** Icon emoji */
  icon: string
  /** Recommended gate detectors */
  recommendedGates: string[]
  /** Recommended trigger detectors */
  recommendedTriggers: string[]
  /** Recommended confluence detectors */
  recommendedConfluence: string[]
  /** Detectors that conflict with this style */
  incompatible: string[]
  /** Best market conditions for this style */
  bestConditions: string[]
  /** Difficulty level */
  difficulty: "beginner" | "intermediate" | "advanced"
  /** Recommended settings */
  recommendedSettings?: RecommendedSettings
}

export const TRADING_STYLES: TradingStyleMeta[] = [
  {
    id: "trend",
    labelEn: "Trend Following",
    labelMn: "Тренд дагах",
    descEn: "Follow the dominant market trend. Entry on pullbacks and continuations.",
    descMn: "Зах зээлийн гол трендийг дагах. Pullback болон continuation дээр орох.",
    icon: "📈",
    recommendedGates: ["GATE_REGIME", "GATE_DRIFT_SENTINEL"],
    recommendedTriggers: ["BOS", "FVG", "MOMENTUM_CONTINUATION", "EQ_BREAK"],
    recommendedConfluence: ["FLAG_PENNANT", "TREND_FIBO", "FIBO_RETRACE_CONFLUENCE"],
    incompatible: ["MEAN_REVERSION_SNAPBACK", "SFP", "DOUBLE_TOP_BOTTOM"],
    bestConditions: ["Strong trending markets", "Low volatility periods"],
    difficulty: "beginner",
    recommendedSettings: {
      minRR: 2.7,
      symbols: ["XAUUSD", "EURUSD", "GBPUSD"],
      timeframes: ["15m", "1h"],
    },
  },
  {
    id: "reversal",
    labelEn: "Reversal Trading",
    labelMn: "Эргэлт барих",
    descEn: "Catch market reversals at key levels. Counter-trend entries.",
    descMn: "Түлхүүр түвшин дээр зах зээлийн эргэлтийг барих. Counter-trend entry.",
    icon: "🔄",
    recommendedGates: ["GATE_REGIME", "GATE_VOLATILITY"],
    recommendedTriggers: ["SWEEP", "SFP", "CHOCH", "MEAN_REVERSION_SNAPBACK"],
    recommendedConfluence: ["PINBAR_AT_LEVEL", "FAKEOUT_TRAP", "DOUBLE_TOP_BOTTOM", "ENGULF_AT_LEVEL"],
    incompatible: ["BOS", "MOMENTUM_CONTINUATION", "EQ_BREAK"],
    bestConditions: ["Overextended markets", "Key S/R levels", "Divergence present"],
    difficulty: "intermediate",
    recommendedSettings: {
      minRR: 3.0,
      symbols: ["XAUUSD", "BTCUSD", "US30"],
      timeframes: ["15m", "1h", "4h"],
    },
  },
  {
    id: "breakout",
    labelEn: "Breakout Trading",
    labelMn: "Breakout стратеги",
    descEn: "Trade level breakouts with confirmation. High momentum entries.",
    descMn: "Түвшин эвдэлтийг баталгаажуулалттай арилжаалах. Өндөр momentum entry.",
    icon: "💥",
    recommendedGates: ["GATE_REGIME", "GATE_VOLATILITY"],
    recommendedTriggers: ["BREAK_RETEST", "SR_BREAK_CLOSE", "COMPRESSION_EXPANSION", "TRIANGLE_BREAKOUT_CLOSE"],
    recommendedConfluence: ["SR_ROLE_REVERSAL", "FIBO_RETRACE_CONFLUENCE", "FLAG_PENNANT"],
    incompatible: ["SR_BOUNCE", "MEAN_REVERSION_SNAPBACK"],
    bestConditions: ["Consolidation breakouts", "High volume", "Clear S/R levels"],
    difficulty: "intermediate",
    recommendedSettings: {
      minRR: 2.7,
      symbols: ["XAUUSD", "GBPUSD", "NAS100"],
      timeframes: ["15m", "1h"],
    },
  },
  {
    id: "range",
    labelEn: "Range Trading",
    labelMn: "Range арилжаа",
    descEn: "Trade bounces within a defined range. S/R based entries.",
    descMn: "Тодорхой range дотор bounce арилжаалах. S/R дээр суурилсан entry.",
    icon: "↔️",
    recommendedGates: ["GATE_REGIME", "GATE_VOLATILITY"],
    recommendedTriggers: ["SR_BOUNCE", "MEAN_REVERSION_SNAPBACK"],
    recommendedConfluence: ["PINBAR_AT_LEVEL", "RECTANGLE_RANGE_EDGE", "ENGULF_AT_LEVEL", "DOJI"],
    incompatible: ["BOS", "BREAK_RETEST", "SR_BREAK_CLOSE", "MOMENTUM_CONTINUATION"],
    bestConditions: ["Sideways markets", "Clear support/resistance", "Low volatility"],
    difficulty: "beginner",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURUSD", "GBPJPY", "USDJPY"],
      timeframes: ["1h", "4h"],
    },
  },
  {
    id: "institutional",
    labelEn: "Smart Money / ICT",
    labelMn: "Smart Money / ICT",
    descEn: "Follow institutional order flow. Order blocks and imbalances.",
    descMn: "Институционал захиалгын урсгалыг дагах. Order block, imbalance.",
    icon: "🏦",
    recommendedGates: ["GATE_REGIME", "GATE_DRIFT_SENTINEL"],
    recommendedTriggers: ["OB", "FVG", "IMBALANCE", "EQ_BREAK", "SWEEP"],
    recommendedConfluence: ["FIBO_RETRACE_CONFLUENCE", "SR_ROLE_REVERSAL", "PINBAR_AT_LEVEL"],
    incompatible: ["TRIANGLE_BREAKOUT_CLOSE", "MEAN_REVERSION_SNAPBACK"],
    bestConditions: ["Liquid markets", "Clear order flow", "News events"],
    difficulty: "advanced",
    recommendedSettings: {
      minRR: 3.0,
      symbols: ["XAUUSD", "EURUSD", "NAS100"],
      timeframes: ["15m", "1h", "4h"],
    },
  },
]

/** Map of style ID to metadata */
export const TRADING_STYLE_BY_ID = new Map<TradingStyle, TradingStyleMeta>(
  TRADING_STYLES.map(s => [s.id, s])
)

/**
 * Get style metadata by ID
 */
export function getTradingStyleById(id: TradingStyle): TradingStyleMeta | undefined {
  return TRADING_STYLE_BY_ID.get(id)
}

/**
 * Get all recommended detectors for a style
 */
export function getRecommendedDetectorsForStyle(styleId: TradingStyle): string[] {
  const style = getTradingStyleById(styleId)
  if (!style) return []

  return [
    ...style.recommendedGates,
    ...style.recommendedTriggers,
    ...style.recommendedConfluence,
  ]
}

/**
 * Check if a detector is compatible with a style
 */
export function isDetectorCompatibleWithStyle(detectorId: string, styleId: TradingStyle): boolean {
  const style = getTradingStyleById(styleId)
  if (!style) return true // Unknown style = allow all

  return !style.incompatible.includes(detectorId)
}

/**
 * Get incompatibility reason if detector conflicts with style
 */
export function getIncompatibilityReason(detectorId: string, styleId: TradingStyle): string | null {
  const style = getTradingStyleById(styleId)
  if (!style || !style.incompatible.includes(detectorId)) return null

  const styleLabel = style.labelEn

  // Specific reasons
  if (styleId === "trend" && ["MEAN_REVERSION_SNAPBACK", "SFP", "DOUBLE_TOP_BOTTOM"].includes(detectorId)) {
    return `Counter-trend detector. Conflicts with ${styleLabel} strategy.`
  }
  if (styleId === "reversal" && ["BOS", "MOMENTUM_CONTINUATION", "EQ_BREAK"].includes(detectorId)) {
    return `Trend continuation detector. Conflicts with ${styleLabel} strategy.`
  }
  if (styleId === "breakout" && ["SR_BOUNCE", "MEAN_REVERSION_SNAPBACK"].includes(detectorId)) {
    return `Range/bounce detector. Conflicts with ${styleLabel} strategy.`
  }
  if (styleId === "range" && ["BOS", "BREAK_RETEST", "SR_BREAK_CLOSE", "MOMENTUM_CONTINUATION"].includes(detectorId)) {
    return `Breakout/trend detector. Conflicts with ${styleLabel} strategy.`
  }

  return `May conflict with ${styleLabel} strategy approach.`
}

/**
 * Suggest a trading style based on selected detectors
 */
export function suggestStyleFromDetectors(detectors: string[]): TradingStyle | null {
  if (detectors.length === 0) return null

  // Score each style based on how many recommended detectors match
  const scores: Record<TradingStyle, number> = {
    trend: 0,
    reversal: 0,
    breakout: 0,
    range: 0,
    institutional: 0,
  }

  for (const style of TRADING_STYLES) {
    const allRecommended = [
      ...style.recommendedTriggers,
      ...style.recommendedConfluence,
    ]

    for (const detector of detectors) {
      if (allRecommended.includes(detector)) {
        scores[style.id] += 1
      }
      // Penalty for incompatible detectors
      if (style.incompatible.includes(detector)) {
        scores[style.id] -= 2
      }
    }
  }

  // Find highest scoring style
  let bestStyle: TradingStyle | null = null
  let bestScore = 0

  for (const [styleId, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestStyle = styleId as TradingStyle
    }
  }

  return bestScore > 0 ? bestStyle : null
}
