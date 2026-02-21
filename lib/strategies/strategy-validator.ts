/**
 * Strategy Validator & Health Score Engine
 *
 * Centralized semantic validation for user strategies.
 * Used by both V2 API routes (server-side) and UI components (client-side).
 *
 * Health Score: 0-100 deterministic rubric across 5 dimensions.
 */

import {
  DETECTOR_CATALOG,
  PHANTOM_IDS,
  IMPLEMENTED_IDS,
  getDetectorById,
  type DetectorMeta,
} from "@/lib/detectors/catalog"

// ============================================================
// Types
// ============================================================

export type ValidationSeverity = "error" | "warning" | "info"

export interface ValidationIssue {
  code: string
  severity: ValidationSeverity
  messageEn: string
  messageMn: string
  field?: string
}

export interface HealthScoreBreakdown {
  /** 0-30: gate + trigger + confluence composition */
  structure: number
  /** 0-25: all detectors implemented in backend */
  implementation: number
  /** 0-15: entry_tf < trend_tf hierarchy */
  timeframe: number
  /** 0-20: synergy minus conflict penalties */
  synergy: number
  /** 0-10: family diversity */
  diversity: number
}

export type HealthGrade = "excellent" | "good" | "fair" | "poor" | "broken"

export interface StrategyValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  infos: ValidationIssue[]
  healthScore: number
  healthGrade: HealthGrade
  healthBreakdown: HealthScoreBreakdown
}

export interface StrategyValidationInput {
  name?: string
  detectors: string[]
  entry_tf?: string | null
  trend_tf?: string | string[] | null
  config?: Record<string, unknown> | null
}

// ============================================================
// Constants
// ============================================================

const TF_ORDER: Record<string, number> = {
  M5: 0,
  M15: 1,
  M30: 2,
  H1: 3,
  H4: 4,
  D1: 5,
}

// Tag groups for diversity scoring
const TRIGGER_FAMILIES: Record<string, string[]> = {
  structure: ["BOS", "CHOCH", "EQ_BREAK"],
  zone: ["OB", "FVG", "IMBALANCE", "SR_BOUNCE", "SR_BREAK_CLOSE"],
  momentum: ["MOMENTUM_CONTINUATION", "COMPRESSION_EXPANSION", "MEAN_REVERSION_SNAPBACK"],
  pattern: ["BREAK_RETEST", "SWEEP", "SFP", "TRIANGLE_BREAKOUT_CLOSE"],
}

const CONFLUENCE_FAMILIES: Record<string, string[]> = {
  candle: ["PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL", "DOJI"],
  pattern: ["DOUBLE_TOP_BOTTOM", "HEAD_SHOULDERS", "FLAG_PENNANT", "RECTANGLE_RANGE_EDGE"],
  fibonacci: ["FIBO_EXTENSION", "FIBO_RETRACE_CONFLUENCE", "TREND_FIBO"],
  level: ["FAKEOUT_TRAP", "SR_ROLE_REVERSAL", "PRICE_MOMENTUM_WEAKENING"],
}

const HIGH_IMPACT_IDS = new Set(
  DETECTOR_CATALOG.filter((d) => d.impact === "high").map((d) => d.id)
)

// ============================================================
// Main Validation Function
// ============================================================

export function validateStrategy(
  input: StrategyValidationInput
): StrategyValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const infos: ValidationIssue[] = []

  const detectors = input.detectors || []

  // Resolve detector metadata
  const resolved: DetectorMeta[] = []
  for (const id of detectors) {
    const meta = getDetectorById(id)
    if (meta) {
      resolved.push(meta)
    }
  }

  const gates = resolved.filter((d) => d.category === "gate")
  const triggers = resolved.filter((d) => d.category === "trigger")
  const confluence = resolved.filter((d) => d.category === "confluence")

  // ----------------------------------------------------------
  // Hard Errors (block save)
  // ----------------------------------------------------------

  if (detectors.length === 0) {
    errors.push({
      code: "NO_DETECTORS",
      severity: "error",
      messageEn: "No detectors selected. Add at least 1 gate and 1 trigger.",
      messageMn: "Detector сонгоогүй байна. Хамгийн багадаа 1 gate, 1 trigger нэмнэ үү.",
      field: "detectors",
    })
  }

  if (detectors.length > 0 && gates.length === 0) {
    errors.push({
      code: "NO_GATE_DETECTOR",
      severity: "error",
      messageEn: "At least 1 gate detector is required.",
      messageMn: "Хамгийн багадаа 1 gate detector шаардлагатай.",
      field: "detectors",
    })
  }

  if (detectors.length > 0 && triggers.length === 0) {
    errors.push({
      code: "NO_TRIGGER_DETECTOR",
      severity: "error",
      messageEn: "At least 1 trigger detector is required to generate signals.",
      messageMn: "Сигнал үүсгэхийн тулд хамгийн багадаа 1 trigger detector шаардлагатай.",
      field: "detectors",
    })
  }

  if (
    detectors.length > 0 &&
    !detectors.some((id) => id.toUpperCase() === "GATE_REGIME")
  ) {
    errors.push({
      code: "GATE_REGIME_MISSING",
      severity: "error",
      messageEn: "GATE_REGIME is required for all strategies.",
      messageMn: "GATE_REGIME бүх стратегид заавал байх ёстой.",
      field: "detectors",
    })
  }

  // All detectors are phantom → strategy will produce 0 signals
  const implementedCount = resolved.filter((d) => d.implemented).length
  if (detectors.length > 0 && implementedCount === 0) {
    errors.push({
      code: "ALL_PHANTOM",
      severity: "error",
      messageEn:
        "All selected detectors are not yet implemented. Strategy will produce 0 signals.",
      messageMn:
        "Бүх сонгосон detector одоогоор хэрэгжээгүй. Стратеги 0 сигнал үүсгэнэ.",
      field: "detectors",
    })
  }

  // ----------------------------------------------------------
  // Soft Warnings (allow save but warn)
  // ----------------------------------------------------------

  // Phantom detectors
  const phantomSelected = detectors.filter((id) => PHANTOM_IDS.has(id.toUpperCase()))
  if (phantomSelected.length > 0) {
    warnings.push({
      code: "PHANTOM_DETECTOR",
      severity: "warning",
      messageEn: `${phantomSelected.join(", ")} not yet implemented — will be skipped by scanner.`,
      messageMn: `${phantomSelected.join(", ")} одоогоор хэрэгжээгүй — сканнер алгасна.`,
      field: "detectors",
    })
  }

  // TF hierarchy check
  const entryTf = (input.entry_tf || "").toUpperCase()
  const trendTfRaw = input.trend_tf
  const trendTfs: string[] = Array.isArray(trendTfRaw)
    ? trendTfRaw.map((t) => t.toUpperCase())
    : trendTfRaw
      ? [trendTfRaw.toUpperCase()]
      : []

  if (entryTf && trendTfs.length > 0) {
    const entryIdx = TF_ORDER[entryTf]
    if (entryIdx !== undefined) {
      for (const tf of trendTfs) {
        const trendIdx = TF_ORDER[tf]
        if (trendIdx !== undefined && entryIdx >= trendIdx) {
          warnings.push({
            code: "ENTRY_TF_GTE_TREND_TF",
            severity: "warning",
            messageEn: `Entry TF (${entryTf}) must be lower than Trend TF (${tf}). Example: M15 entry with H1 trend.`,
            messageMn: `Entry TF (${entryTf}) нь Trend TF (${tf})-ээс доогуур байх ёстой. Жишээ: M15 entry + H1 trend.`,
            field: "timeframe",
          })
        }
      }
    }
  }

  // No confluence
  if (detectors.length > 0 && confluence.length === 0) {
    warnings.push({
      code: "NO_CONFLUENCE",
      severity: "warning",
      messageEn: "No confluence detectors. Adding confirmation signals improves quality.",
      messageMn: "Confluence detector байхгүй. Баталгаажуулалт нэмвэл чанар сайжирна.",
      field: "detectors",
    })
  }

  // Too many detectors
  if (detectors.length > 12) {
    warnings.push({
      code: "TOO_MANY_DETECTORS",
      severity: "warning",
      messageEn: `${detectors.length} detectors selected. Consider using 3-8 for best results.`,
      messageMn: `${detectors.length} detector сонгосон. 3-8 байвал хамгийн сайн үр дүн өгнө.`,
      field: "detectors",
    })
  }

  // Unknown detectors (not in catalog at all)
  const unknownIds = detectors.filter((id) => !getDetectorById(id))
  if (unknownIds.length > 0) {
    warnings.push({
      code: "UNKNOWN_DETECTOR",
      severity: "warning",
      messageEn: `Unknown detectors: ${unknownIds.join(", ")}. They will be ignored.`,
      messageMn: `Тодорхойгүй detector: ${unknownIds.join(", ")}. Алгасагдана.`,
      field: "detectors",
    })
  }

  // ----------------------------------------------------------
  // Health Score
  // ----------------------------------------------------------
  const breakdown = calculateHealthBreakdown(
    resolved,
    gates,
    triggers,
    confluence,
    entryTf,
    trendTfs,
    detectors
  )

  let healthScore =
    breakdown.structure +
    breakdown.implementation +
    breakdown.timeframe +
    breakdown.synergy +
    breakdown.diversity

  // Clamp on hard errors
  if (errors.length > 0) {
    healthScore = Math.min(healthScore, 15)
  }

  healthScore = Math.max(0, Math.min(100, healthScore))

  const healthGrade = getGrade(healthScore, errors.length > 0)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    infos,
    healthScore,
    healthGrade,
    healthBreakdown: breakdown,
  }
}

// ============================================================
// Health Score Calculation
// ============================================================

function calculateHealthBreakdown(
  resolved: DetectorMeta[],
  gates: DetectorMeta[],
  triggers: DetectorMeta[],
  confluence: DetectorMeta[],
  entryTf: string,
  trendTfs: string[],
  rawIds: string[]
): HealthScoreBreakdown {
  // --- Structure (0-30) ---
  let structure = 0
  if (gates.length >= 1) structure += 10
  if (triggers.length >= 1) structure += 10
  if (confluence.length >= 1) structure += 5
  if (rawIds.some((id) => id.toUpperCase() === "GATE_REGIME")) structure += 5

  // --- Implementation (0-25) ---
  let implementation = 0
  if (resolved.length > 0) {
    const implCount = resolved.filter((d) => d.implemented).length
    implementation = Math.round((implCount / resolved.length) * 25)
  }

  // --- Timeframe (0-15) ---
  let timeframe = 0
  if (entryTf && trendTfs.length > 0) {
    const entryIdx = TF_ORDER[entryTf]
    if (entryIdx !== undefined) {
      const allLower = trendTfs.every((tf) => {
        const tIdx = TF_ORDER[tf]
        return tIdx !== undefined && entryIdx < tIdx
      })
      if (allLower) {
        timeframe += 10
        // Bonus for >=2 gap (e.g., M15 -> H1 = 2 levels apart)
        const minGap = Math.min(
          ...trendTfs
            .map((tf) => (TF_ORDER[tf] ?? 0) - entryIdx)
            .filter((g) => g > 0)
        )
        if (minGap >= 2) timeframe += 5
      }
    }
  } else if (!entryTf && trendTfs.length === 0) {
    // No TF configured = neutral (default M15/H4 will be used)
    timeframe = 10
  }

  // --- Synergy (0-20) ---
  let synergy = 0
  if (resolved.length >= 2) {
    // Simple synergy: each unique category pair gets points
    const cats = new Set(resolved.map((d) => d.category))
    synergy += cats.size * 5 // max 15 for all 3 categories
    // High-impact detectors bonus
    const highImpact = resolved.filter((d) => d.impact === "high").length
    if (highImpact >= 1) synergy += 2
    if (highImpact >= 2) synergy += 3
    synergy = Math.min(20, synergy)
  }

  // --- Diversity (0-10) ---
  let diversity = 0
  // Count trigger families covered
  const triggerIds = new Set(triggers.map((d) => d.id))
  const trigFamilies = Object.values(TRIGGER_FAMILIES).filter((members) =>
    members.some((m) => triggerIds.has(m))
  ).length
  if (trigFamilies >= 2) diversity += 4

  // Count confluence families covered
  const confIds = new Set(confluence.map((d) => d.id))
  const confFamilies = Object.values(CONFLUENCE_FAMILIES).filter((members) =>
    members.some((m) => confIds.has(m))
  ).length
  if (confFamilies >= 2) diversity += 3

  // High-impact in both trigger and confluence
  const hasHighTrigger = triggers.some((d) => HIGH_IMPACT_IDS.has(d.id))
  const hasHighConf = confluence.some((d) => HIGH_IMPACT_IDS.has(d.id))
  if (hasHighTrigger && hasHighConf) diversity += 3

  return {
    structure,
    implementation,
    timeframe,
    synergy: Math.min(20, synergy),
    diversity: Math.min(10, diversity),
  }
}

function getGrade(score: number, hasErrors: boolean): HealthGrade {
  if (hasErrors) return "broken"
  if (score >= 85) return "excellent"
  if (score >= 70) return "good"
  if (score >= 50) return "fair"
  if (score >= 25) return "poor"
  return "broken"
}

// ============================================================
// UI Helpers
// ============================================================

export function getHealthScoreColor(grade: HealthGrade): string {
  switch (grade) {
    case "excellent":
      return "text-green-500"
    case "good":
      return "text-green-400"
    case "fair":
      return "text-yellow-500"
    case "poor":
      return "text-orange-500"
    case "broken":
      return "text-red-500"
  }
}

export function getHealthScoreBadgeClass(grade: HealthGrade): string {
  switch (grade) {
    case "excellent":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "good":
      return "bg-green-400/10 text-green-400 border-green-400/20"
    case "fair":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    case "poor":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20"
    case "broken":
      return "bg-red-500/10 text-red-500 border-red-500/20"
  }
}

export function getHealthGradeLabel(grade: HealthGrade): { en: string; mn: string } {
  switch (grade) {
    case "excellent":
      return { en: "Excellent", mn: "Маш сайн" }
    case "good":
      return { en: "Good", mn: "Сайн" }
    case "fair":
      return { en: "Fair", mn: "Дунд" }
    case "poor":
      return { en: "Poor", mn: "Сул" }
    case "broken":
      return { en: "Broken", mn: "Алдаатай" }
  }
}
