/**
 * Detector Catalog - Single Source of Truth
 * 
 * This file contains all detector metadata used throughout the dashboard.
 * Both Strategy Maker and Simulator MUST import from this file.
 * 
 * DO NOT duplicate detector lists elsewhere!
 * 
 * Canonical IDs: UPPERCASE_SNAKE_CASE (stable, used by backend)
 * UI displays: English (primary) + Mongolian (secondary)
 */

// ============================================================
// Types
// ============================================================

export type DetectorCategory = "gate" | "trigger" | "confluence"
export type DetectorImpact = "high" | "medium" | "low"
export type DetectorCost = "light" | "medium" | "heavy"

export interface DetectorMeta {
  /** Canonical ID - UPPERCASE_SNAKE_CASE, used by backend */
  id: string
  /** English label (PRIMARY - shown in UI) */
  labelEn: string
  /** Mongolian label (SECONDARY - optional subtitle) */
  labelMn: string
  /** Short label for badges/compact views */
  labelShort: string
  /** English description (PRIMARY) */
  descEn: string
  /** Mongolian description (SECONDARY/legacy) */
  descriptionMn: string
  /** Category: gate, trigger, or confluence */
  category: DetectorCategory
  /** Performance impact on strategy */
  impact: DetectorImpact
  /** Computational cost */
  cost: DetectorCost
  /** If true, cannot be removed from selection */
  required?: boolean
  /** Tags for search/filtering */
  tags?: string[]
}

// ============================================================
// Detector Catalog (31 total)
// ============================================================

export const DETECTOR_CATALOG: DetectorMeta[] = [
  // ============================================================
  // 🚦 GATE DETECTORS (3) - Market condition filters
  // "If gate fails → block trades"
  // ============================================================
  {
    id: "GATE_REGIME",
    labelEn: "Regime Filter",
    labelMn: "Regime шүүлтүүр",
    labelShort: "Regime",
    descEn: "Checks if market is trending. Blocks trades during choppy conditions. Required for all strategies.",
    descriptionMn: "Зах зээл trend эсэхийг шалгаж, choppy үед trade-г блоклоно. Заавал сонгосон байх ёстой.",
    category: "gate",
    impact: "high",
    cost: "light",
    required: true,
    tags: ["trend", "filter", "regime"],
  },
  {
    id: "GATE_VOLATILITY",
    labelEn: "Volatility Filter",
    labelMn: "Volatility шүүлтүүр",
    labelShort: "Volatility",
    descEn: "Measures volatility via ATR. Blocks trades during extremely low or high volatility.",
    descriptionMn: "ATR-ээр volatility хэмжиж, хэт бага/өндөр volatility үед trade блоклоно.",
    category: "gate",
    impact: "medium",
    cost: "light",
    tags: ["volatility", "atr", "filter"],
  },
  {
    id: "GATE_DRIFT_SENTINEL",
    labelEn: "Drift Sentinel",
    labelMn: "Drift Sentinel",
    labelShort: "Drift",
    descEn: "Prevents counter-trend trades during strong momentum drift.",
    descriptionMn: "Хүчтэй momentum drift үед counter-trend trade хийхээс сэргийлнэ.",
    category: "gate",
    impact: "medium",
    cost: "light",
    tags: ["momentum", "drift", "filter"],
  },

  // ============================================================
  // 🎯 TRIGGER DETECTORS (15) - Entry signal generators
  // "Triggers create entries"
  // ============================================================
  {
    id: "BOS",
    labelEn: "Break of Structure",
    labelMn: "Бүтэц эвдрэлт (BOS)",
    labelShort: "BOS",
    descEn: "Break of Structure - trend continuation signal when swing high/low is broken.",
    descriptionMn: "Break of Structure - swing high/low эвдрэхэд тренд үргэлжлэх сигнал.",
    category: "trigger",
    impact: "high",
    cost: "light",
    tags: ["structure", "breakout", "trend"],
  },
  {
    id: "FVG",
    labelEn: "Fair Value Gap",
    labelMn: "Fair Value Gap",
    labelShort: "FVG",
    descEn: "3-candle gap pattern indicating institutional movement.",
    descriptionMn: "3 candlestick-ийн дунд gap - институционал хөдөлгөөн илэрнэ.",
    category: "trigger",
    impact: "high",
    cost: "light",
    tags: ["gap", "institutional", "imbalance"],
  },
  {
    id: "OB",
    labelEn: "Order Block",
    labelMn: "Order Block",
    labelShort: "OB",
    descEn: "Institutional order zone - the opposing candle before a large move.",
    descriptionMn: "Институционал захиалгын бүс - том move-ийн өмнөх эсрэг candle.",
    category: "trigger",
    impact: "high",
    cost: "medium",
    tags: ["institutional", "zone", "supply-demand"],
  },
  {
    id: "CHOCH",
    labelEn: "Change of Character",
    labelMn: "Trend өөрчлөлт (CHoCH)",
    labelShort: "CHoCH",
    descEn: "Change of Character - the first sign of trend reversal.",
    descriptionMn: "Change of Character - тренд эргэлтийн анхны дохио.",
    category: "trigger",
    impact: "high",
    cost: "light",
    tags: ["reversal", "structure", "change"],
  },
  {
    id: "EQ_BREAK",
    labelEn: "Equilibrium Break",
    labelMn: "Equilibrium эвдрэлт",
    labelShort: "EQ Break",
    descEn: "Strong continuation signal when price breaks the 50% retracement level.",
    descriptionMn: "50% retrace түвшинг эвдрэхэд тренд үргэлжлэх хүчтэй сигнал.",
    category: "trigger",
    impact: "medium",
    cost: "light",
    tags: ["equilibrium", "50%", "continuation"],
  },
  {
    id: "SWEEP",
    labelEn: "Liquidity Sweep",
    labelMn: "Liquidity Sweep",
    labelShort: "Sweep",
    descEn: "Stop hunting pattern - temporarily breaks old high/low then reverses.",
    descriptionMn: "Хуучин high/low түр эвдээд буцах - stop hunting pattern.",
    category: "trigger",
    impact: "high",
    cost: "light",
    tags: ["liquidity", "sweep", "stop-hunt"],
  },
  {
    id: "IMBALANCE",
    labelEn: "Price Imbalance",
    labelMn: "Үнийн тэнцвэргүй байдал",
    labelShort: "Imbalance",
    descEn: "Buy/Sell force imbalance. Similar to FVG.",
    descriptionMn: "Buy/Sell хүчний тэнцвэргүй байдал. FVG-тай төстэй.",
    category: "trigger",
    impact: "medium",
    cost: "light",
    tags: ["imbalance", "gap", "inefficiency"],
  },
  {
    id: "SFP",
    labelEn: "Swing Failure Pattern",
    labelMn: "Swing Failure Pattern",
    labelShort: "SFP",
    descEn: "Reversal signal when price breaks swing high/low but closes back inside.",
    descriptionMn: "Swing high/low эвдээд буцаж хаагдах - reversal сигнал.",
    category: "trigger",
    impact: "high",
    cost: "light",
    tags: ["reversal", "failure", "trap"],
  },
  {
    id: "BREAK_RETEST",
    labelEn: "Break & Retest",
    labelMn: "Break & Retest",
    labelShort: "Break Retest",
    descEn: "Classic pattern - break level, retest it, then continue in trend direction.",
    descriptionMn: "Түвшин эвдэж, retest хийгээд trend руу үргэлжлэх. Классик pattern.",
    category: "trigger",
    impact: "high",
    cost: "medium",
    tags: ["breakout", "retest", "confirmation"],
  },
  {
    id: "COMPRESSION_EXPANSION",
    labelEn: "Compression → Expansion",
    labelMn: "Compression → Expansion",
    labelShort: "Compression",
    descEn: "Strong breakout from a tight range. Volatility expansion.",
    descriptionMn: "Нарийн range-ээс хүчтэй breakout. Volatility expansion.",
    category: "trigger",
    impact: "medium",
    cost: "medium",
    tags: ["compression", "expansion", "volatility"],
  },
  {
    id: "MOMENTUM_CONTINUATION",
    labelEn: "Momentum Continuation",
    labelMn: "Momentum үргэлжлэл",
    labelShort: "Momentum",
    descEn: "Continuation signal after a strong trend move.",
    descriptionMn: "Хүчтэй trend-ийн дараа momentum үргэлжлэх дохио.",
    category: "trigger",
    impact: "medium",
    cost: "light",
    tags: ["momentum", "continuation", "trend"],
  },
  {
    id: "MEAN_REVERSION_SNAPBACK",
    labelEn: "Mean Reversion Snapback",
    labelMn: "Mean Reversion",
    labelShort: "Snapback",
    descEn: "Counter-trend entry when price snaps back to the mean from overextended levels.",
    descriptionMn: "Үнэ дундаж руугаа буцах. Overextended үед counter-trend.",
    category: "trigger",
    impact: "medium",
    cost: "medium",
    tags: ["mean-reversion", "oversold", "overbought"],
  },
  {
    id: "SR_BOUNCE",
    labelEn: "S/R Bounce",
    labelMn: "S/R Bounce",
    labelShort: "SR Bounce",
    descEn: "Bounce entry from Support/Resistance level.",
    descriptionMn: "Support/Resistance түвшнээс bounce. Key level entry.",
    category: "trigger",
    impact: "high",
    cost: "medium",
    tags: ["support", "resistance", "bounce"],
  },
  {
    id: "SR_BREAK_CLOSE",
    labelEn: "S/R Break & Close",
    labelMn: "S/R Break & Close",
    labelShort: "SR Break",
    descEn: "Confirmation breakout - break S/R level and close beyond it.",
    descriptionMn: "S/R түвшинг эвдэж, цаана хаагдах. Confirmation breakout.",
    category: "trigger",
    impact: "high",
    cost: "medium",
    tags: ["support", "resistance", "breakout"],
  },
  {
    id: "TRIANGLE_BREAKOUT_CLOSE",
    labelEn: "Triangle Breakout",
    labelMn: "Triangle Breakout",
    labelShort: "Triangle",
    descEn: "Breakout from triangle pattern. Move after consolidation.",
    descriptionMn: "Triangle pattern-ээс breakout. Consolidation дараах move.",
    category: "trigger",
    impact: "medium",
    cost: "heavy",
    tags: ["triangle", "pattern", "breakout"],
  },

  // ============================================================
  // 🔗 CONFLUENCE DETECTORS (13) - Confirmation signals
  // "Adds quality / confidence" - Optional
  // ============================================================
  {
    id: "DOJI",
    labelEn: "Doji Candle",
    labelMn: "Doji Candle",
    labelShort: "Doji",
    descEn: "Indecision candle (open ≈ close). Reversal signal at S/R levels.",
    descriptionMn: "Тэнцвэртэй candle - шийдвэргүй байдал. S/R дээр reversal.",
    category: "confluence",
    impact: "low",
    cost: "light",
    tags: ["candle", "indecision", "reversal"],
  },
  {
    id: "DOUBLE_TOP_BOTTOM",
    labelEn: "Double Top/Bottom",
    labelMn: "Double Top/Bottom",
    labelShort: "Double TB",
    descEn: "Classic reversal pattern - double peak or double trough.",
    descriptionMn: "Давхар оргил/ёроол - классик reversal pattern.",
    category: "confluence",
    impact: "medium",
    cost: "medium",
    tags: ["pattern", "reversal", "double"],
  },
  {
    id: "ENGULF_AT_LEVEL",
    labelEn: "Engulfing at Level",
    labelMn: "Engulfing at Level",
    labelShort: "Engulfing",
    descEn: "Engulfing candle at a key level. Strong reversal signal.",
    descriptionMn: "Key түвшин дээр engulfing candle. Хүчтэй reversal.",
    category: "confluence",
    impact: "medium",
    cost: "light",
    tags: ["candle", "engulfing", "reversal"],
  },
  {
    id: "FAKEOUT_TRAP",
    labelEn: "Fakeout Trap",
    labelMn: "Fakeout Trap",
    labelShort: "Fakeout",
    descEn: "False breakout - breaks level but reverses back. Stop hunt entry.",
    descriptionMn: "Хуурамч breakout - түвшин эвдээд буцах. Stop hunt entry.",
    category: "confluence",
    impact: "medium",
    cost: "light",
    tags: ["trap", "fakeout", "reversal"],
  },
  {
    id: "FIBO_EXTENSION",
    labelEn: "Fibonacci Extension",
    labelMn: "Fibonacci Extension",
    labelShort: "Fibo Ext",
    descEn: "Fibonacci extension levels (127.2%, 161.8%) for TP targets.",
    descriptionMn: "Fibo extension түвшин (127.2%, 161.8%). TP target.",
    category: "confluence",
    impact: "low",
    cost: "light",
    tags: ["fibonacci", "extension", "target"],
  },
  {
    id: "FIBO_RETRACE_CONFLUENCE",
    labelEn: "Fibo Retracement Zone",
    labelMn: "Fibo Retracement",
    labelShort: "Fibo Ret",
    descEn: "38.2%, 50%, 61.8% retracement levels for entry zones.",
    descriptionMn: "38.2%, 50%, 61.8% retracement түвшин. Entry zone.",
    category: "confluence",
    impact: "medium",
    cost: "light",
    tags: ["fibonacci", "retracement", "entry"],
  },
  {
    id: "FLAG_PENNANT",
    labelEn: "Flag / Pennant",
    labelMn: "Flag/Pennant",
    labelShort: "Flag",
    descEn: "Continuation pattern - consolidation after a strong move.",
    descriptionMn: "Continuation pattern - хүчтэй move дараа consolidation.",
    category: "confluence",
    impact: "medium",
    cost: "medium",
    tags: ["pattern", "flag", "continuation"],
  },
  {
    id: "HEAD_SHOULDERS",
    labelEn: "Head & Shoulders",
    labelMn: "Head & Shoulders",
    labelShort: "H&S",
    descEn: "Classic reversal pattern - entry on neckline break.",
    descriptionMn: "Толгой мөр pattern - neckline break-ээр reversal entry.",
    category: "confluence",
    impact: "high",
    cost: "heavy",
    tags: ["pattern", "reversal", "head-shoulders"],
  },
  {
    id: "PINBAR_AT_LEVEL",
    labelEn: "Pinbar at Level",
    labelMn: "Pinbar at Level",
    labelShort: "Pinbar",
    descEn: "Pinbar/hammer at a key level. Rejection signal.",
    descriptionMn: "Key түвшин дээр pinbar/hammer. Rejection сигнал.",
    category: "confluence",
    impact: "medium",
    cost: "light",
    tags: ["candle", "pinbar", "rejection"],
  },
  {
    id: "PRICE_MOMENTUM_WEAKENING",
    labelEn: "Momentum Weakening",
    labelMn: "Momentum суларч байна",
    labelShort: "Weak Momentum",
    descEn: "Indicates trend strength is weakening. Divergence signal.",
    descriptionMn: "Trend хүч суларч байгааг илтгэнэ. Divergence signal.",
    category: "confluence",
    impact: "medium",
    cost: "medium",
    tags: ["momentum", "divergence", "weakness"],
  },
  {
    id: "RECTANGLE_RANGE_EDGE",
    labelEn: "Rectangle/Range Edge",
    labelMn: "Rectangle/Range Edge",
    labelShort: "Range Edge",
    descEn: "Top/bottom of a range. Bounce or breakout setup.",
    descriptionMn: "Range-ийн дээд/доод хил. Bounce эсвэл breakout.",
    category: "confluence",
    impact: "medium",
    cost: "medium",
    tags: ["range", "rectangle", "edge"],
  },
  {
    id: "SR_ROLE_REVERSAL",
    labelEn: "S/R Role Reversal",
    labelMn: "S/R Role Reversal",
    labelShort: "SR Flip",
    descEn: "Support becomes Resistance (or vice versa). Polarity shift.",
    descriptionMn: "Support → Resistance болох эсвэл эсрэгээр. Polarity shift.",
    category: "confluence",
    impact: "high",
    cost: "medium",
    tags: ["support", "resistance", "flip"],
  },
  {
    id: "TREND_FIBO",
    labelEn: "Trend + Fibo Confluence",
    labelMn: "Trend + Fibo",
    labelShort: "Trend Fibo",
    descEn: "Trend direction aligns with Fibo level. Strong confluence.",
    descriptionMn: "Trend чиглэл + Fibo түвшин давхцах. Strong confluence.",
    category: "confluence",
    impact: "medium",
    cost: "light",
    tags: ["trend", "fibonacci", "confluence"],
  },
]

// ============================================================
// Lookup Maps (for fast access)
// ============================================================

/** Map of detector ID to metadata */
export const DETECTOR_BY_ID = new Map<string, DetectorMeta>(
  DETECTOR_CATALOG.map(d => [d.id, d])
)

/** Set of all canonical detector IDs */
export const CANONICAL_IDS = new Set(DETECTOR_CATALOG.map(d => d.id))

/** Alias map for legacy/alternative detector IDs */
export const DETECTOR_ALIASES: Record<string, string> = {
  // Legacy aliases (map to canonical IDs)
  "ORDER_BLOCK": "OB",
  "ORDERBLOCK": "OB",
  "BREAKOUT_RETEST_ENTRY": "BREAK_RETEST",
  "BREAK_RETEST_ENTRY": "BREAK_RETEST",
  "FIBO_RETRACE": "FIBO_RETRACE_CONFLUENCE",
  "SR_POLARITY": "SR_ROLE_REVERSAL",
}

/** Detectors grouped by category */
export const DETECTORS_BY_CATEGORY: Record<DetectorCategory, DetectorMeta[]> = {
  gate: DETECTOR_CATALOG.filter(d => d.category === "gate"),
  trigger: DETECTOR_CATALOG.filter(d => d.category === "trigger"),
  confluence: DETECTOR_CATALOG.filter(d => d.category === "confluence"),
}

/** Count by category */
export const DETECTOR_COUNTS = {
  gate: DETECTORS_BY_CATEGORY.gate.length,
  trigger: DETECTORS_BY_CATEGORY.trigger.length,
  confluence: DETECTORS_BY_CATEGORY.confluence.length,
  total: DETECTOR_CATALOG.length,
}

/** Required detectors (cannot be removed) */
export const REQUIRED_DETECTORS = DETECTOR_CATALOG
  .filter(d => d.required)
  .map(d => d.id)

// ============================================================
// Presets
// ============================================================

export interface PresetPerformance {
  /** Historical win rate (0-100) */
  winrate: number
  /** Total trades in backtest */
  totalTrades: number
  /** Profit factor (gross profit / gross loss) */
  profitFactor: number
  /** Confidence level based on sample size */
  confidence: "high" | "medium" | "low"
  /** Data period (e.g. "2023-2024") */
  period?: string
}

export interface RecommendedSettings {
  /** Minimum Risk/Reward ratio */
  minRR: number
  /** Best performing symbols */
  symbols: string[]
  /** Best performing timeframes */
  timeframes: string[]
}

export interface DetectorPreset {
  id: string
  nameEn: string
  nameMn: string
  descEn: string
  descriptionMn: string
  detectors: string[]
  icon: string
  /** Backtest performance data */
  performance?: PresetPerformance
  /** Recommended settings for this preset */
  recommendedSettings?: RecommendedSettings
  /** Trading style this preset is best for */
  style?: "trend" | "reversal" | "breakout" | "range" | "institutional"
  /** Difficulty level */
  difficulty?: "beginner" | "intermediate" | "advanced"
  /** Is this a popular/featured preset */
  isPopular?: boolean
}

export const DETECTOR_PRESETS: DetectorPreset[] = [
  // ============================================================
  // 15 Symbol-Based Strategy Presets (Backtest Verified)
  // Last updated: 2026-02-06
  // ============================================================
  {
    id: "EURUSD",
    nameEn: "EURUSD - CHOCH Momentum",
    nameMn: "EURUSD - CHOCH Momentum",
    descEn: "4h CHOCH Momentum strategy optimized for EURUSD.",
    descriptionMn: "EURUSD-д зориулсан 4h CHOCH Momentum стратеги.",
    detectors: ["GATE_REGIME", "CHOCH", "MOMENTUM_CONTINUATION"],
    icon: "🇪🇺",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURUSD"],
      timeframes: ["4h"],
    },
    style: "trend",
    difficulty: "beginner",
    isPopular: true,
  },
  {
    id: "USDJPY",
    nameEn: "USDJPY - Mean Reversion",
    nameMn: "USDJPY - Mean Reversion",
    descEn: "4h Mean Reversion strategy optimized for USDJPY.",
    descriptionMn: "USDJPY-д зориулсан 4h Mean Reversion стратеги.",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    icon: "🇯🇵",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["USDJPY"],
      timeframes: ["4h"],
    },
    style: "reversal",
    difficulty: "beginner",
    isPopular: true,
  },
  {
    id: "GBPUSD",
    nameEn: "GBPUSD - EQ Break",
    nameMn: "GBPUSD - EQ Break",
    descEn: "4h EQ Break strategy optimized for GBPUSD.",
    descriptionMn: "GBPUSD-д зориулсан 4h EQ Break стратеги.",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    icon: "🇬🇧",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["GBPUSD"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "beginner",
    isPopular: true,
  },
  {
    id: "AUDUSD",
    nameEn: "AUDUSD - EQ Break",
    nameMn: "AUDUSD - EQ Break",
    descEn: "4h EQ Break strategy optimized for AUDUSD.",
    descriptionMn: "AUDUSD-д зориулсан 4h EQ Break стратеги.",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    icon: "🇦🇺",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["AUDUSD"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "beginner",
    isPopular: false,
  },
  {
    id: "USDCAD",
    nameEn: "USDCAD - EQ Break",
    nameMn: "USDCAD - EQ Break",
    descEn: "4h EQ Break strategy optimized for USDCAD.",
    descriptionMn: "USDCAD-д зориулсан 4h EQ Break стратеги.",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    icon: "🇨🇦",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["USDCAD"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "beginner",
    isPopular: true,
  },
  {
    id: "USDCHF",
    nameEn: "USDCHF - Imbalance Fill",
    nameMn: "USDCHF - Imbalance Fill",
    descEn: "4h Imbalance Fill strategy optimized for USDCHF.",
    descriptionMn: "USDCHF-д зориулсан 4h Imbalance Fill стратеги.",
    detectors: ["GATE_REGIME", "IMBALANCE", "FVG", "SR_BOUNCE"],
    icon: "🇨🇭",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["USDCHF"],
      timeframes: ["4h"],
    },
    style: "reversal",
    difficulty: "intermediate",
    isPopular: false,
  },
  {
    id: "NZDUSD",
    nameEn: "NZDUSD - EQ Break",
    nameMn: "NZDUSD - EQ Break",
    descEn: "1h EQ Break strategy optimized for NZDUSD.",
    descriptionMn: "NZDUSD-д зориулсан 1h EQ Break стратеги.",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    icon: "🇳🇿",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["NZDUSD"],
      timeframes: ["1h"],
    },
    style: "breakout",
    difficulty: "beginner",
    isPopular: true,
  },
  {
    id: "EURJPY",
    nameEn: "EURJPY - Mean Reversion",
    nameMn: "EURJPY - Mean Reversion",
    descEn: "15m Mean Reversion strategy optimized for EURJPY.",
    descriptionMn: "EURJPY-д зориулсан 15m Mean Reversion стратеги.",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    icon: "💶",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURJPY"],
      timeframes: ["15m"],
    },
    style: "reversal",
    difficulty: "intermediate",
    isPopular: true,
  },
  {
    id: "GBPJPY",
    nameEn: "GBPJPY - Mean Reversion",
    nameMn: "GBPJPY - Mean Reversion",
    descEn: "4h Mean Reversion strategy optimized for GBPJPY.",
    descriptionMn: "GBPJPY-д зориулсан 4h Mean Reversion стратеги.",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    icon: "💷",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["GBPJPY"],
      timeframes: ["4h"],
    },
    style: "reversal",
    difficulty: "intermediate",
    isPopular: true,
  },
  {
    id: "EURGBP",
    nameEn: "EURGBP - Mean Reversion",
    nameMn: "EURGBP - Mean Reversion",
    descEn: "15m Mean Reversion strategy optimized for EURGBP.",
    descriptionMn: "EURGBP-д зориулсан 15m Mean Reversion стратеги.",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    icon: "🇪🇺",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURGBP"],
      timeframes: ["15m"],
    },
    style: "reversal",
    difficulty: "intermediate",
    isPopular: true,
  },
  {
    id: "AUDJPY",
    nameEn: "AUDJPY - EQ Break",
    nameMn: "AUDJPY - EQ Break",
    descEn: "4h EQ Break strategy optimized for AUDJPY.",
    descriptionMn: "AUDJPY-д зориулсан 4h EQ Break стратеги.",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    icon: "🇦🇺",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["AUDJPY"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "beginner",
    isPopular: false,
  },
  {
    id: "EURAUD",
    nameEn: "EURAUD - SR Break Close",
    nameMn: "EURAUD - SR Break Close",
    descEn: "4h SR Break Close strategy optimized for EURAUD.",
    descriptionMn: "EURAUD-д зориулсан 4h SR Break Close стратеги.",
    detectors: ["GATE_REGIME", "SR_BREAK_CLOSE", "ENGULF_AT_LEVEL"],
    icon: "🇪🇺",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURAUD"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "intermediate",
    isPopular: true,
  },
  {
    id: "EURCHF",
    nameEn: "EURCHF - SR Break Close",
    nameMn: "EURCHF - SR Break Close",
    descEn: "4h SR Break Close strategy optimized for EURCHF.",
    descriptionMn: "EURCHF-д зориулсан 4h SR Break Close стратеги.",
    detectors: ["GATE_REGIME", "SR_BREAK_CLOSE", "ENGULF_AT_LEVEL"],
    icon: "🇨🇭",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["EURCHF"],
      timeframes: ["4h"],
    },
    style: "breakout",
    difficulty: "intermediate",
    isPopular: false,
  },
  {
    id: "XAUUSD",
    nameEn: "XAUUSD - Trend BOS + FVG",
    nameMn: "XAUUSD (Алт) - Trend BOS + FVG",
    descEn: "4h Trend BOS + FVG strategy optimized for Gold.",
    descriptionMn: "Алтанд зориулсан 4h Trend BOS + FVG стратеги.",
    detectors: ["GATE_REGIME", "BOS", "FVG", "TREND_FIBO"],
    icon: "🥇",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["XAUUSD"],
      timeframes: ["4h"],
    },
    style: "trend",
    difficulty: "intermediate",
    isPopular: true,
  },
  {
    id: "BTCUSD",
    nameEn: "BTCUSD - Mean Reversion",
    nameMn: "BTCUSD (Bitcoin) - Mean Reversion",
    descEn: "1h Mean Reversion strategy optimized for Bitcoin.",
    descriptionMn: "Bitcoin-д зориулсан 1h Mean Reversion стратеги.",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    icon: "₿",
    recommendedSettings: {
      minRR: 2.5,
      symbols: ["BTCUSD"],
      timeframes: ["1h"],
    },
    style: "reversal",
    difficulty: "intermediate",
    isPopular: true,
  },
]

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get detector metadata by ID (supports aliases)
 */
export function getDetectorById(id: string): DetectorMeta | undefined {
  const upperId = id.toUpperCase()
  // Check direct match first
  const direct = DETECTOR_BY_ID.get(upperId)
  if (direct) return direct
  // Check alias
  const canonical = DETECTOR_ALIASES[upperId]
  if (canonical) return DETECTOR_BY_ID.get(canonical)
  return undefined
}

/**
 * Check if a detector ID exists in catalog (supports aliases)
 */
export function isValidDetectorId(id: string): boolean {
  const upperId = id.toUpperCase()
  return CANONICAL_IDS.has(upperId) || upperId in DETECTOR_ALIASES
}

/**
 * Filter detectors by search query
 */
export function searchDetectors(query: string): DetectorMeta[] {
  if (!query.trim()) return DETECTOR_CATALOG
  
  const q = query.toLowerCase()
  return DETECTOR_CATALOG.filter(d => 
    d.id.toLowerCase().includes(q) ||
    d.labelEn.toLowerCase().includes(q) ||
    d.labelMn.toLowerCase().includes(q) ||
    d.labelShort.toLowerCase().includes(q) ||
    d.descEn.toLowerCase().includes(q) ||
    d.descriptionMn.toLowerCase().includes(q) ||
    d.tags?.some(t => t.toLowerCase().includes(q))
  )
}

/**
 * Validate selection rules
 */
export interface SelectionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  counts: {
    gates: number
    triggers: number
    confluence: number
    total: number
  }
}

export function validateSelection(selectedIds: string[]): SelectionValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  const selected = selectedIds.map(id => getDetectorById(id)).filter(Boolean) as DetectorMeta[]
  
  const counts = {
    gates: selected.filter(d => d.category === "gate").length,
    triggers: selected.filter(d => d.category === "trigger").length,
    confluence: selected.filter(d => d.category === "confluence").length,
    total: selected.length,
  }
  
  // Rule 1: At least 1 gate
  if (counts.gates < 1) {
    errors.push("🚦 Gate шүүлтүүр сонгоно уу (хамгийн багадаа 1)")
  }
  
  // Rule 2: At least 1 trigger
  if (counts.triggers < 1) {
    errors.push("🎯 Trigger дохио сонгоно уу (хамгийн багадаа 1)")
  }
  
  // Rule 3: GATE_REGIME is required
  if (!selectedIds.includes("GATE_REGIME")) {
    errors.push("🚦 GATE_REGIME заавал сонгосон байх ёстой")
  }
  
  // Warnings
  if (counts.confluence === 0) {
    warnings.push("💡 Confluence нэмвэл сигналын чанар сайжирна")
  }
  
  if (counts.total > 10) {
    warnings.push("⚠️ Хэт олон detector сонгосон - илүү энгийн байлгах нь дээр")
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    counts,
  }
}

/**
 * Ensure required detectors are always included
 */
export function ensureRequiredDetectors(selectedIds: string[]): string[] {
  const result = [...selectedIds]
  for (const reqId of REQUIRED_DETECTORS) {
    if (!result.includes(reqId)) {
      result.unshift(reqId) // Add at beginning
    }
  }
  return result
}

// ============================================================
// Category Display Helpers
// ============================================================

export const CATEGORY_INFO: Record<DetectorCategory, {
  labelEn: string
  labelMn: string
  descEn: string
  descriptionMn: string
  icon: string
  color: string
}> = {
  gate: {
    labelEn: "Gate (Filter)",
    labelMn: "Gate (Шүүлтүүр)",
    descEn: "If gate fails, trade is blocked",
    descriptionMn: "Gate fail бол trade блоклогдоно",
    icon: "🚦",
    color: "text-yellow-500",
  },
  trigger: {
    labelEn: "Trigger (Entry Signal)",
    labelMn: "Trigger (Entry дохио)",
    descEn: "Creates entry signals",
    descriptionMn: "Entry сигнал үүсгэнэ",
    icon: "🎯",
    color: "text-green-500",
  },
  confluence: {
    labelEn: "Confluence (Confirmation)",
    labelMn: "Confluence (Баталгаа)",
    descEn: "Adds signal quality/confidence",
    descriptionMn: "Сигналын чанар / итгэлийг нэмнэ",
    icon: "🔗",
    color: "text-blue-500",
  },
}

export const IMPACT_BADGES: Record<DetectorImpact, { label: string; className: string }> = {
  high: { label: "High", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  medium: { label: "Med", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  low: { label: "Low", className: "bg-green-500/10 text-green-500 border-green-500/20" },
}

export const COST_BADGES: Record<DetectorCost, { label: string; className: string }> = {
  light: { label: "Light", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  heavy: { label: "Heavy", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
}
