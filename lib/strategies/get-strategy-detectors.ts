/**
 * Get Strategy Detectors - Single helper to extract and normalize detectors
 * 
 * Strategies may have detectors stored in different fields:
 * - detectors[] (new V2 format - preferred)
 * - detectorIds[] (legacy format)
 * - gates[], triggers[], confirms[], confluence[] (very old format)
 * 
 * This helper merges all sources, normalizes to canonical IDs, and returns
 * the result with unknown detectors tracked for UI warning.
 */

import { normalizeDetectorIds, type NormalizeResult } from "@/lib/detectors/normalize"
import { DETECTOR_BY_ID } from "@/lib/detectors/catalog"

/**
 * Extended result with category breakdown
 */
export interface GetStrategyDetectorsResult extends NormalizeResult {
  /** Breakdown by category */
  byCategory: {
    gates: string[]
    triggers: string[]
    confluence: string[]
  }
  /** Summary counts */
  counts: {
    gates: number
    triggers: number
    confluence: number
    total: number
    unknown: number
  }
  /** Display label like "G1 T4 C2" */
  label: string
}

/**
 * Strategy input - accepts various legacy formats
 */
export interface StrategyInput {
  id?: string
  strategy_id?: string
  name?: string
  detectors?: string[]
  detectorIds?: string[]
  gates?: string[]
  triggers?: string[]
  confirms?: string[]
  confluence?: string[]
  [key: string]: any
}

/**
 * Extract and normalize all detectors from a strategy.
 * Handles multiple legacy formats and normalizes to canonical IDs.
 * 
 * @param strategy - Strategy object with any combination of detector fields
 * @returns Normalized result with category breakdown
 */
export function getStrategyDetectors(strategy: StrategyInput | null | undefined): GetStrategyDetectorsResult {
  if (!strategy) {
    return {
      requested: [],
      normalized: [],
      unknown: [],
      changed: false,
      byCategory: { gates: [], triggers: [], confluence: [] },
      counts: { gates: 0, triggers: 0, confluence: 0, total: 0, unknown: 0 },
      label: "G0 T0 C0",
    }
  }

  // Collect all detector IDs from various sources
  const allDetectors: string[] = []

  // New format (V2): detectors[]
  if (Array.isArray(strategy.detectors)) {
    allDetectors.push(...strategy.detectors)
  }

  // Legacy format: detectorIds[]
  if (Array.isArray(strategy.detectorIds)) {
    allDetectors.push(...strategy.detectorIds)
  }

  // Very old format: gates[], triggers[], confirms[], confluence[]
  if (Array.isArray(strategy.gates)) {
    allDetectors.push(...strategy.gates)
  }
  if (Array.isArray(strategy.triggers)) {
    allDetectors.push(...strategy.triggers)
  }
  if (Array.isArray(strategy.confirms)) {
    allDetectors.push(...strategy.confirms)
  }
  if (Array.isArray(strategy.confluence)) {
    allDetectors.push(...strategy.confluence)
  }

  // Normalize all collected detectors
  const result = normalizeDetectorIds(allDetectors)

  // Categorize normalized detectors
  const byCategory: GetStrategyDetectorsResult["byCategory"] = {
    gates: [],
    triggers: [],
    confluence: [],
  }

  for (const detId of result.normalized) {
    const meta = DETECTOR_BY_ID.get(detId)
    if (!meta) continue

    switch (meta.category) {
      case "gate":
        byCategory.gates.push(detId)
        break
      case "trigger":
        byCategory.triggers.push(detId)
        break
      case "confluence":
        byCategory.confluence.push(detId)
        break
    }
  }

  const counts: GetStrategyDetectorsResult["counts"] = {
    gates: byCategory.gates.length,
    triggers: byCategory.triggers.length,
    confluence: byCategory.confluence.length,
    total: result.normalized.length,
    unknown: result.unknown.length,
  }

  // Generate label like "G1 T4 C2"
  const label = `G${counts.gates} T${counts.triggers} C${counts.confluence}`

  return {
    ...result,
    byCategory,
    counts,
    label,
  }
}

/**
 * Get detector count display string for a strategy.
 * 
 * @param strategy - Strategy object
 * @returns String like "7 detectors (G1 T4 C2)" or "0 detectors"
 */
export function getDetectorCountLabel(strategy: StrategyInput | null | undefined): string {
  const result = getStrategyDetectors(strategy)
  
  if (result.counts.total === 0) {
    return "0 detectors"
  }

  const unknownSuffix = result.counts.unknown > 0 
    ? ` ⚠️${result.counts.unknown} unknown` 
    : ""

  return `${result.counts.total} detectors (${result.label})${unknownSuffix}`
}

/**
 * Check if strategy has any unknown detectors that need fixing.
 */
export function hasUnknownDetectors(strategy: StrategyInput | null | undefined): boolean {
  const result = getStrategyDetectors(strategy)
  return result.counts.unknown > 0
}

/**
 * Get only the normalized (valid) detectors list.
 * Use this when you just need the detector IDs for a run.
 */
export function getNormalizedDetectorsList(strategy: StrategyInput | null | undefined): string[] {
  return getStrategyDetectors(strategy).normalized
}
