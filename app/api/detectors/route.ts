import { NextRequest, NextResponse } from "next/server"
import { 
  DETECTOR_CATALOG, 
  DETECTOR_BY_ID,
  DETECTORS_BY_CATEGORY,
  DETECTOR_COUNTS,
  CANONICAL_IDS,
  type DetectorMeta 
} from "@/lib/detectors/catalog"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"

/**
 * Detector API Route
 * 
 * This endpoint serves detector metadata from the single source of truth.
 * See: lib/detectors/catalog.ts
 * 
 * DO NOT add detector definitions here - use the catalog!
 */

// Legacy interface for backward compatibility
export interface DetectorMetadata {
  id: string
  labelEn: string
  labelMn: string
  descEn: string
  descriptionMn: string
  category: "gate" | "trigger" | "confluence"
}

/**
 * GET /api/detectors
 * 
 * Returns list of all detectors with English (primary) and Mongolian labels.
 * Uses the single source of truth from lib/detectors/catalog.ts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") as "gate" | "trigger" | "confluence" | null
  
  // Map catalog format to API format
  const mapToApi = (d: DetectorMeta): DetectorMetadata => ({
    id: d.id,
    labelEn: d.labelEn,
    labelMn: d.labelMn,
    descEn: d.descEn,
    descriptionMn: d.descriptionMn,
    category: d.category,
  })
  
  let detectors: DetectorMetadata[]
  
  // Filter by category if specified
  if (category && DETECTORS_BY_CATEGORY[category]) {
    detectors = DETECTORS_BY_CATEGORY[category].map(mapToApi)
  } else {
    detectors = DETECTOR_CATALOG.map(mapToApi)
  }
  
  return NextResponse.json({
    ok: true,
    detectors,
    count: detectors.length,
    categories: DETECTOR_COUNTS,
    version: getDashboardVersion(),
  })
}
