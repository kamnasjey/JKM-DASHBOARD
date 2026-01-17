import { NextRequest, NextResponse } from "next/server"
import { 
  DETECTOR_CATALOG, 
  DETECTOR_BY_ID,
  DETECTORS_BY_CATEGORY,
  DETECTOR_COUNTS,
  CANONICAL_IDS,
  type DetectorMeta 
} from "@/lib/detectors/catalog"

export const runtime = "nodejs"

/**
 * Detector API Route
 * 
 * This endpoint serves detector metadata from the single source of truth.
 * See: lib/detectors/catalog.ts
 * 
 * DO NOT add detector definitions here - use the catalog!
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

// Legacy interface for backward compatibility
export interface DetectorMetadata {
  id: string
  labelMn: string
  descriptionMn: string
  category: "gate" | "trigger" | "confluence"
}

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
 * Uses the single source of truth from lib/detectors/catalog.ts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") as "gate" | "trigger" | "confluence" | null
  
  // Map catalog format to legacy API format for backward compatibility
  const mapToLegacy = (d: DetectorMeta): DetectorMetadata => ({
    id: d.id,
    labelMn: d.labelMn,
    descriptionMn: d.descriptionMn,
    category: d.category,
  })
  
  let detectors: DetectorMetadata[]
  
  // Filter by category if specified
  if (category && DETECTORS_BY_CATEGORY[category]) {
    detectors = DETECTORS_BY_CATEGORY[category].map(mapToLegacy)
  } else {
    detectors = DETECTOR_CATALOG.map(mapToLegacy)
  }
  
  return NextResponse.json({
    ok: true,
    detectors,
    count: detectors.length,
    categories: DETECTOR_COUNTS,
  })
}
