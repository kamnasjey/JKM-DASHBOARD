/**
 * Detector-Regime Compatibility Mapping
 *
 * Defines which detectors work best in which market regimes.
 * Used to show warnings when user selects detectors that may not
 * perform well in current market conditions.
 */

export type MarketRegime = "trending_up" | "trending_down" | "ranging" | "volatile" | "unknown"

/**
 * Detector compatibility with market regimes
 * - trending: Works in trending_up and trending_down
 * - ranging: Works in ranging/sideways markets
 * - reversal: Works at trend changes
 * - all: Works in all regimes
 */
export const DETECTOR_REGIME_COMPATIBILITY: Record<string, {
  regimes: MarketRegime[]
  description: string
}> = {
  // === GATES ===
  GATE_REGIME: {
    regimes: ["trending_up", "trending_down", "ranging", "volatile"],
    description: "Бүх горимд ажиллана - горим тодорхойлогч"
  },
  GATE_VOLATILITY: {
    regimes: ["trending_up", "trending_down", "ranging", "volatile"],
    description: "Бүх горимд ажиллана - volatility шүүлт"
  },
  GATE_DRIFT_SENTINEL: {
    regimes: ["trending_up", "trending_down", "ranging", "volatile"],
    description: "Бүх горимд ажиллана - drift илрүүлэгч"
  },

  // === SMC/ICT TRIGGERS - Trending дээр сайн ===
  BOS: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  FVG: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  OB: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  IMBALANCE: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  EQ_BREAK: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  MOMENTUM_CONTINUATION: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  BREAK_RETEST: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },

  // === REVERSAL TRIGGERS ===
  CHOCH: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Trend эргэлт дээр ажиллана"
  },
  SWEEP: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Liquidity sweep - бүх горимд"
  },
  SFP: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Swing failure - бүх горимд"
  },

  // === RANGE TRIGGERS ===
  SR_BOUNCE: {
    regimes: ["ranging"],
    description: "Ranging market дээр сайн ажиллана"
  },
  MEAN_REVERSION_SNAPBACK: {
    regimes: ["ranging"],
    description: "Ranging market дээр сайн ажиллана"
  },

  // === BREAKOUT TRIGGERS ===
  SR_BREAK_CLOSE: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Breakout - бүх горимд"
  },
  COMPRESSION_EXPANSION: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Volatility squeeze - бүх горимд"
  },
  TRIANGLE_BREAKOUT_CLOSE: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Pattern breakout - бүх горимд"
  },

  // === CONFLUENCE - Ихэнх нь бүх горимд ===
  DOJI: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Candle pattern - бүх горимд"
  },
  PINBAR_AT_LEVEL: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Candle pattern - бүх горимд"
  },
  ENGULF_AT_LEVEL: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Candle pattern - бүх горимд"
  },
  FIBO_RETRACE_CONFLUENCE: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  FIBO_EXTENSION: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  TREND_FIBO: {
    regimes: ["trending_up", "trending_down"],
    description: "Trending market дээр сайн ажиллана"
  },
  SR_ROLE_REVERSAL: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "S/R polarity - бүх горимд"
  },
  FAKEOUT_TRAP: {
    regimes: ["ranging"],
    description: "Ranging market дээр сайн ажиллана"
  },
  RECTANGLE_RANGE_EDGE: {
    regimes: ["ranging"],
    description: "Ranging market дээр сайн ажиллана"
  },
  DOUBLE_TOP_BOTTOM: {
    regimes: ["trending_up", "trending_down", "ranging"],
    description: "Reversal pattern - бүх горимд"
  },
  HEAD_SHOULDERS: {
    regimes: ["trending_up", "trending_down"],
    description: "Reversal pattern - trend дээр"
  },
  FLAG_PENNANT: {
    regimes: ["trending_up", "trending_down"],
    description: "Continuation pattern - trend дээр"
  },
  PRICE_MOMENTUM_WEAKENING: {
    regimes: ["trending_up", "trending_down"],
    description: "Momentum - trend дээр"
  },
}

/**
 * Check if a detector is compatible with a given regime
 */
export function isDetectorCompatible(
  detectorId: string,
  regime: MarketRegime
): boolean {
  const normalized = detectorId.toUpperCase()
  const compatibility = DETECTOR_REGIME_COMPATIBILITY[normalized]

  if (!compatibility) {
    // Unknown detector - assume compatible
    return true
  }

  return compatibility.regimes.includes(regime)
}

/**
 * Get incompatible detectors for a given regime
 */
export function getIncompatibleDetectors(
  detectors: string[],
  regime: MarketRegime
): Array<{ id: string; description: string }> {
  if (regime === "unknown") return []

  return detectors
    .filter(d => !isDetectorCompatible(d, regime))
    .map(d => ({
      id: d,
      description: DETECTOR_REGIME_COMPATIBILITY[d.toUpperCase()]?.description || "Unknown"
    }))
}

/**
 * Get regime display info
 */
export function getRegimeDisplay(regime: MarketRegime): {
  label: string
  icon: string
  color: string
} {
  switch (regime) {
    case "trending_up":
      return { label: "Trending ↑", icon: "↑", color: "text-green-500" }
    case "trending_down":
      return { label: "Trending ↓", icon: "↓", color: "text-red-500" }
    case "ranging":
      return { label: "Ranging ↔", icon: "↔", color: "text-yellow-500" }
    case "volatile":
      return { label: "Volatile ⚡", icon: "⚡", color: "text-orange-500" }
    default:
      return { label: "Unknown", icon: "?", color: "text-muted-foreground" }
  }
}

/**
 * Get compatible regimes for a list of detectors
 * Returns regimes where ALL detectors can work
 */
export function getCompatibleRegimes(detectors: string[]): MarketRegime[] {
  if (detectors.length === 0) return ["trending_up", "trending_down", "ranging"]

  const allRegimes: MarketRegime[] = ["trending_up", "trending_down", "ranging"]

  return allRegimes.filter(regime =>
    detectors.every(d => isDetectorCompatible(d, regime))
  )
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for first value
  let sum = 0
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i]
  }
  ema[period - 1] = sum / period

  // Calculate EMA for rest
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }

  return ema
}

/**
 * Calculate market regime from candle data
 * Uses EMA20/EMA50 crossover and price position
 *
 * @param candles - Array of candles with OHLC data
 * @returns MarketRegime - trending_up, trending_down, ranging, or unknown
 */
export function calculateRegimeFromCandles(
  candles: Array<{ o: number; h: number; l: number; c: number }>
): MarketRegime {
  if (candles.length < 50) {
    return "unknown"
  }

  // Get close prices (oldest to newest)
  const closes = candles.map(c => c.c)

  // Calculate EMAs
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)

  // Get latest values
  const lastIdx = closes.length - 1
  const currentPrice = closes[lastIdx]
  const currentEma20 = ema20[lastIdx]
  const currentEma50 = ema50[lastIdx]

  if (!currentEma20 || !currentEma50) {
    return "unknown"
  }

  // Calculate ATR for volatility check (simple approach)
  const recentCandles = candles.slice(-14)
  let atrSum = 0
  for (const c of recentCandles) {
    atrSum += c.h - c.l
  }
  const avgRange = atrSum / recentCandles.length
  const priceRange = currentPrice * 0.03 // 3% threshold

  // High volatility check
  if (avgRange > priceRange) {
    return "volatile"
  }

  // Trend determination using EMA crossover
  const emaDiff = ((currentEma20 - currentEma50) / currentEma50) * 100

  // Strong trend: EMA20 > EMA50 by more than 0.5% and price above EMA20
  if (emaDiff > 0.5 && currentPrice > currentEma20) {
    return "trending_up"
  }

  // Strong downtrend: EMA20 < EMA50 by more than 0.5% and price below EMA20
  if (emaDiff < -0.5 && currentPrice < currentEma20) {
    return "trending_down"
  }

  // Otherwise ranging
  return "ranging"
}

/**
 * Multi-timeframe regime info type
 */
export interface TimeframeRegime {
  timeframe: string
  regime: MarketRegime
  display: ReturnType<typeof getRegimeDisplay>
}

/**
 * Get warnings for detectors based on multi-timeframe regimes
 */
export function getDetectorWarnings(
  detectors: string[],
  regimes: TimeframeRegime[]
): Array<{
  timeframe: string
  regime: MarketRegime
  incompatible: string[]
}> {
  return regimes
    .filter(r => r.regime !== "unknown")
    .map(r => ({
      timeframe: r.timeframe,
      regime: r.regime,
      incompatible: getIncompatibleDetectors(detectors, r.regime).map(d => d.id)
    }))
    .filter(w => w.incompatible.length > 0)
}
