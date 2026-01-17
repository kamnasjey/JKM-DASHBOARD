import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Detector Metadata with Cyrillic (Mongolian) Labels
 * 
 * This is the source of truth for detector information in the dashboard.
 * Synced with backend's core/detectors_api.py
 */

// Alias mapping for duplicate/legacy detectors
// BREAKOUT_RETEST_ENTRY is consolidated into BREAK_RETEST
const DETECTOR_ALIASES: Record<string, string> = {
  // Duplicate detector mapping
  "breakout_retest_entry": "BREAK_RETEST",
  "breakout-retest-entry": "BREAK_RETEST",
  "BREAKOUT_RETEST_ENTRY": "BREAK_RETEST",
  
  // Common aliases
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

export interface DetectorMetadata {
  id: string
  labelMn: string
  descriptionMn: string
  category: "gate" | "trigger" | "confluence"
}

/**
 * Complete detector list with Cyrillic labels
 * Total: 31 detectors (3 gates + 15 triggers + 13 confluence)
 * Note: BREAKOUT_RETEST_ENTRY removed (aliased to BREAK_RETEST)
 */
export const DETECTOR_METADATA: DetectorMetadata[] = [
  // ============================================================
  // GATE DETECTORS (3) - Market condition filters
  // ============================================================
  {
    id: "GATE_REGIME",
    labelMn: "Зах зээлийн горим (GATE_REGIME)",
    descriptionMn: "Зах зээл trending эсвэл ranging горимд байгааг тодорхойлно. Trending үед trend-follow стратеги сайн ажиллана.",
    category: "gate",
  },
  {
    id: "GATE_VOLATILITY",
    labelMn: "Volatility шүүлтүүр (GATE_VOLATILITY)",
    descriptionMn: "ATR-ээр volatility хэмжиж, хэт бага эсвэл хэт өндөр volatility үед trade хийхгүй.",
    category: "gate",
  },
  {
    id: "GATE_DRIFT_SENTINEL",
    labelMn: "Drift Sentinel (GATE_DRIFT_SENTINEL)",
    descriptionMn: "Зах зээлийн momentum болон drift чиглэлийг хянана. Хүчтэй drift үед counter-trend trade хийхээс сэргийлнэ.",
    category: "gate",
  },
  
  // ============================================================
  // TRIGGER DETECTORS (15) - Entry signals
  // ============================================================
  {
    id: "BOS",
    labelMn: "Бүтэц эвдрэлт (BOS)",
    descriptionMn: "Break of Structure - сүүлийн swing high/low эвдрэхэд тренд үргэлжлэх сигнал өгнө.",
    category: "trigger",
  },
  {
    id: "FVG",
    labelMn: "Fair Value Gap (FVG)",
    descriptionMn: "Үнийн зай - 3 candlestick-ийн дунд gap үүсэхэд институционал хөдөлгөөн илэрнэ.",
    category: "trigger",
  },
  {
    id: "OB",
    labelMn: "Order Block (OB)",
    descriptionMn: "Институционал захиалгын бүс - том хөдөлгөөний өмнөх сүүлчийн эсрэг чиглэлийн candle.",
    category: "trigger",
  },
  {
    id: "CHOCH",
    labelMn: "Trend өөрчлөлт (CHOCH)",
    descriptionMn: "Change of Character - тренд эргэлтийн анхны дохио. BOS-ын эсрэг чиглэлд.",
    category: "trigger",
  },
  {
    id: "EQ_BREAK",
    labelMn: "Equilibrium эвдрэлт (EQ_BREAK)",
    descriptionMn: "50% retrace түвшинг эвдрэхэд тренд үргэлжлэх хүчтэй сигнал.",
    category: "trigger",
  },
  {
    id: "SWEEP",
    labelMn: "Liquidity Sweep (SWEEP)",
    descriptionMn: "Хуучин high/low-г түр зуур эвдээд буцах хөдөлгөөн. Stop hunting pattern.",
    category: "trigger",
  },
  {
    id: "IMBALANCE",
    labelMn: "Үнийн тэнцвэргүй байдал (IMBALANCE)",
    descriptionMn: "Худалдан авах/зарах хүчний тэнцвэргүй байдал. FVG-тай төстэй.",
    category: "trigger",
  },
  {
    id: "SFP",
    labelMn: "Swing Failure Pattern (SFP)",
    descriptionMn: "Swing high/low эвдээд буцаж хаагдах. Reversal сигнал.",
    category: "trigger",
  },
  {
    id: "BREAK_RETEST",
    labelMn: "Break & Retest (BREAK_RETEST)",
    descriptionMn: "Түвшин эвдэж, дахин test хийгээд trend чиглэлд үргэлжлэх. Классик entry pattern.",
    category: "trigger",
  },
  {
    id: "COMPRESSION_EXPANSION",
    labelMn: "Compression → Expansion (COMPRESSION)",
    descriptionMn: "Нарийн range-ээс хүчтэй breakout гарах. Volatility contraction → expansion.",
    category: "trigger",
  },
  {
    id: "MOMENTUM_CONTINUATION",
    labelMn: "Momentum үргэлжлэл (MOMENTUM)",
    descriptionMn: "Хүчтэй trend-ийн дараа momentum үргэлжлэх дохио.",
    category: "trigger",
  },
  {
    id: "MEAN_REVERSION_SNAPBACK",
    labelMn: "Mean Reversion (SNAPBACK)",
    descriptionMn: "Үнэ дундаж руугаа буцах. Overextended үед counter-trend entry.",
    category: "trigger",
  },
  {
    id: "SR_BOUNCE",
    labelMn: "S/R Bounce (SR_BOUNCE)",
    descriptionMn: "Support/Resistance түвшнээс bounce хийх. Key level дээр entry.",
    category: "trigger",
  },
  {
    id: "SR_BREAK_CLOSE",
    labelMn: "S/R Break & Close (SR_BREAK_CLOSE)",
    descriptionMn: "S/R түвшинг эвдэж, түүний цаана хаагдах. Confirmation breakout.",
    category: "trigger",
  },
  {
    id: "TRIANGLE_BREAKOUT_CLOSE",
    labelMn: "Triangle Breakout (TRIANGLE)",
    descriptionMn: "Triangle pattern-ээс breakout гарах. Consolidation дараа.",
    category: "trigger",
  },
  
  // ============================================================
  // CONFLUENCE DETECTORS (13) - Confirmation signals
  // ============================================================
  {
    id: "DOJI",
    labelMn: "Doji Candle (DOJI)",
    descriptionMn: "Тэнцвэртэй candle - шийдвэргүй байдал. S/R дээр reversal сигнал.",
    category: "confluence",
  },
  {
    id: "DOUBLE_TOP_BOTTOM",
    labelMn: "Double Top/Bottom (DBL_TB)",
    descriptionMn: "Давхар оргил/ёроол. Классик reversal pattern.",
    category: "confluence",
  },
  {
    id: "ENGULF_AT_LEVEL",
    labelMn: "Engulfing at Level (ENGULF)",
    descriptionMn: "Key түвшин дээр engulfing candle. Хүчтэй reversal дохио.",
    category: "confluence",
  },
  {
    id: "FAKEOUT_TRAP",
    labelMn: "Fakeout Trap (FAKEOUT)",
    descriptionMn: "Хуурамч breakout - түвшин эвдээд буцах. Stop hunt дараах entry.",
    category: "confluence",
  },
  {
    id: "FIBO_EXTENSION",
    labelMn: "Fibonacci Extension (FIBO_EXT)",
    descriptionMn: "Fibo extension түвшин (127.2%, 161.8%). TP target тодорхойлоход хэрэглэнэ.",
    category: "confluence",
  },
  {
    id: "FIBO_RETRACE_CONFLUENCE",
    labelMn: "Fibo Retracement (FIBO_RET)",
    descriptionMn: "38.2%, 50%, 61.8% retracement түвшин. Entry zone тодорхойлоход.",
    category: "confluence",
  },
  {
    id: "FLAG_PENNANT",
    labelMn: "Flag/Pennant Pattern (FLAG)",
    descriptionMn: "Continuation pattern - хүчтэй move дараа consolidation.",
    category: "confluence",
  },
  {
    id: "HEAD_SHOULDERS",
    labelMn: "Head & Shoulders (H&S)",
    descriptionMn: "Толгой мөр pattern - reversal дохио. Neckline break-ээр entry.",
    category: "confluence",
  },
  {
    id: "PINBAR_AT_LEVEL",
    labelMn: "Pinbar at Level (PINBAR)",
    descriptionMn: "Key түвшин дээр pinbar/hammer. Rejection сигнал.",
    category: "confluence",
  },
  {
    id: "PRICE_MOMENTUM_WEAKENING",
    labelMn: "Momentum суларч байна (MOM_WEAK)",
    descriptionMn: "Trend хүч суларч байгааг илтгэнэ. Divergence, candle size багасах.",
    category: "confluence",
  },
  {
    id: "RECTANGLE_RANGE_EDGE",
    labelMn: "Rectangle Range Edge (RECT)",
    descriptionMn: "Range-ийн дээд/доод хил. Bounce эсвэл breakout entry.",
    category: "confluence",
  },
  {
    id: "SR_ROLE_REVERSAL",
    labelMn: "S/R Role Reversal (SR_FLIP)",
    descriptionMn: "Support → Resistance болох эсвэл эсрэгээр. Polarity shift.",
    category: "confluence",
  },
  {
    id: "TREND_FIBO",
    labelMn: "Trend + Fibo Confluence (TREND_FIBO)",
    descriptionMn: "Trend чиглэл + Fibo түвшин давхцах. Хүчтэй confluence.",
    category: "confluence",
  },
]

// Build lookup for fast access
const DETECTOR_BY_ID = new Map(DETECTOR_METADATA.map(d => [d.id, d]))
const CANONICAL_IDS = new Set(DETECTOR_METADATA.map(d => d.id))

/**
 * Normalize a detector ID to canonical backend format.
 * Handles aliases and naming variations.
 */
export function normalizeDetectorId(raw: string): string {
  if (!raw) return ""
  
  // Trim and replace separators
  const normalized = raw.trim().replace(/-/g, "_").replace(/\s+/g, "_").replace(/\./g, "_")
  
  // Check lowercase for alias lookup
  const lower = normalized.toLowerCase()
  if (DETECTOR_ALIASES[lower]) {
    return DETECTOR_ALIASES[lower]
  }
  
  // Check uppercase alias too
  const upper = normalized.toUpperCase()
  if (DETECTOR_ALIASES[upper]) {
    return DETECTOR_ALIASES[upper]
  }
  
  return upper
}

/**
 * Normalize a list of detector IDs and remove duplicates.
 * After normalization, BREAKOUT_RETEST_ENTRY becomes BREAK_RETEST.
 */
export function normalizeDetectorList(detectors: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  
  for (const det of detectors) {
    const canonical = normalizeDetectorId(det)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      result.push(canonical)
    }
  }
  
  return result
}

/**
 * Check if a detector ID is valid (after normalization)
 */
export function isValidDetector(detectorId: string): boolean {
  const canonical = normalizeDetectorId(detectorId)
  return CANONICAL_IDS.has(canonical)
}

/**
 * GET /api/detectors
 * 
 * Returns list of all detectors with Cyrillic labels and descriptions.
 * This endpoint is public (no auth required) as it's just metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  
  let detectors = DETECTOR_METADATA
  
  // Filter by category if specified
  if (category && ["gate", "trigger", "confluence"].includes(category)) {
    detectors = detectors.filter(d => d.category === category)
  }
  
  // Count by category
  const categories = {
    gate: DETECTOR_METADATA.filter(d => d.category === "gate").length,
    trigger: DETECTOR_METADATA.filter(d => d.category === "trigger").length,
    confluence: DETECTOR_METADATA.filter(d => d.category === "confluence").length,
  }
  
  return NextResponse.json({
    ok: true,
    detectors,
    count: detectors.length,
    categories,
  })
}
