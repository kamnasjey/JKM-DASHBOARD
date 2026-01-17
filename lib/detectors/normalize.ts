/**
 * Detector Normalization - Single Source of Truth
 * 
 * This module provides centralized detector ID normalization used throughout:
 * - UI (DetectorSelect "Fix Normalize")
 * - Firestore storage (create/update strategies)
 * - Simulator API (before forwarding to backend)
 * 
 * Import from here instead of duplicating normalization logic!
 */

import { CANONICAL_IDS, DETECTOR_BY_ID } from "./catalog"

// ============================================================
// Alias Mapping
// ============================================================

/**
 * Map legacy/alternative detector names to canonical IDs.
 * 
 * IMPORTANT: Add all known legacy IDs here so saved strategies don't show "Unknown".
 * The canonical IDs are defined in catalog.ts (all UPPERCASE_SNAKE_CASE).
 */
const DETECTOR_ALIASES: Record<string, string> = {
  // ============================================================
  // Legacy IDs from old strategies - MUST be mapped
  // ============================================================
  
  // gate_regime -> GATE_REGIME (canonical)
  "gate_regime": "GATE_REGIME",
  "gateregime": "GATE_REGIME",
  "gate-regime": "GATE_REGIME",
  "regime": "GATE_REGIME",
  
  // break_retest -> BREAK_RETEST (canonical)
  "break_retest": "BREAK_RETEST",
  "breakretest": "BREAK_RETEST",
  "break-retest": "BREAK_RETEST",
  
  // breakout_retest_entry -> BREAK_RETEST (consolidated duplicate)
  "breakout_retest_entry": "BREAK_RETEST",
  "BREAKOUT_RETEST_ENTRY": "BREAK_RETEST",
  "breakout-retest-entry": "BREAK_RETEST",
  "breakoutretestentry": "BREAK_RETEST",
  
  // triangle_breakout_close -> TRIANGLE_BREAKOUT_CLOSE (canonical)
  "triangle_breakout_close": "TRIANGLE_BREAKOUT_CLOSE",
  "trianglebreakoutclose": "TRIANGLE_BREAKOUT_CLOSE",
  "triangle-breakout-close": "TRIANGLE_BREAKOUT_CLOSE",
  "triangle_breakout": "TRIANGLE_BREAKOUT_CLOSE",
  
  // trend_fibo -> TREND_FIBO (canonical)
  "trend_fibo": "TREND_FIBO",
  "trendfibo": "TREND_FIBO",
  "trend-fibo": "TREND_FIBO",
  
  // sr_role_reversal -> SR_ROLE_REVERSAL (canonical)
  "sr_role_reversal": "SR_ROLE_REVERSAL",
  "srrolereversal": "SR_ROLE_REVERSAL",
  "sr-role-reversal": "SR_ROLE_REVERSAL",
  "sr-flip": "SR_ROLE_REVERSAL",
  "sr_flip": "SR_ROLE_REVERSAL",
  
  // price_momentum_weakening -> PRICE_MOMENTUM_WEAKENING (canonical)
  "price_momentum_weakening": "PRICE_MOMENTUM_WEAKENING",
  "pricemomentumweakening": "PRICE_MOMENTUM_WEAKENING",
  "price-momentum-weakening": "PRICE_MOMENTUM_WEAKENING",
  "momentum_weakening": "PRICE_MOMENTUM_WEAKENING",
  
  // ============================================================
  // Common naming variations (lowercase/kebab/compact)
  // ============================================================
  
  // Gate aliases
  "gate-volatility": "GATE_VOLATILITY",
  "gate_volatility": "GATE_VOLATILITY",
  "gatevolatility": "GATE_VOLATILITY",
  "volatility_filter": "GATE_VOLATILITY",
  
  "gate-drift": "GATE_DRIFT_SENTINEL",
  "gate_drift": "GATE_DRIFT_SENTINEL",
  "gatedrift": "GATE_DRIFT_SENTINEL",
  "drift_sentinel": "GATE_DRIFT_SENTINEL",
  
  // Trigger aliases
  "eq-break": "EQ_BREAK",
  "eq_break": "EQ_BREAK",
  "eqbreak": "EQ_BREAK",
  "equilibrium": "EQ_BREAK",
  "equilibrium_break": "EQ_BREAK",
  
  "break-of-structure": "BOS",
  "break_of_structure": "BOS",
  "breakofstructure": "BOS",
  
  "fair-value-gap": "FVG",
  "fair_value_gap": "FVG",
  "fairvaluegap": "FVG",
  
  "order-block": "OB",
  "order_block": "OB",
  "orderblock": "OB",
  
  "change-of-character": "CHOCH",
  "change_of_character": "CHOCH",
  "changeofcharacter": "CHOCH",
  
  "liquidity-sweep": "SWEEP",
  "liquidity_sweep": "SWEEP",
  "liquiditysweep": "SWEEP",
  
  "swing-failure": "SFP",
  "swing_failure": "SFP",
  "swingfailure": "SFP",
  "swing_failure_pattern": "SFP",
  
  "sr-bounce": "SR_BOUNCE",
  "sr_bounce": "SR_BOUNCE",
  "srbounce": "SR_BOUNCE",
  
  "sr-break-close": "SR_BREAK_CLOSE",
  "sr_break_close": "SR_BREAK_CLOSE",
  "srbreakclose": "SR_BREAK_CLOSE",
  
  "compression-expansion": "COMPRESSION_EXPANSION",
  "compression_expansion": "COMPRESSION_EXPANSION",
  "compressionexpansion": "COMPRESSION_EXPANSION",
  
  "momentum-continuation": "MOMENTUM_CONTINUATION",
  "momentum_continuation": "MOMENTUM_CONTINUATION",
  "momentumcontinuation": "MOMENTUM_CONTINUATION",
  
  "mean-reversion-snapback": "MEAN_REVERSION_SNAPBACK",
  "mean_reversion_snapback": "MEAN_REVERSION_SNAPBACK",
  "meanreversionsnapback": "MEAN_REVERSION_SNAPBACK",
  "mean_reversion": "MEAN_REVERSION_SNAPBACK",
  
  // Confluence aliases
  "fibo-ext": "FIBO_EXTENSION",
  "fibo_ext": "FIBO_EXTENSION",
  "fiboext": "FIBO_EXTENSION",
  "fibo_extension": "FIBO_EXTENSION",
  
  "fibo-ret": "FIBO_RETRACE_CONFLUENCE",
  "fibo_ret": "FIBO_RETRACE_CONFLUENCE",
  "fiboret": "FIBO_RETRACE_CONFLUENCE",
  "fibo_retrace": "FIBO_RETRACE_CONFLUENCE",
  "fibo_retrace_confluence": "FIBO_RETRACE_CONFLUENCE",
  
  "h-s": "HEAD_SHOULDERS",
  "h_s": "HEAD_SHOULDERS",
  "hs": "HEAD_SHOULDERS",
  "head-shoulders": "HEAD_SHOULDERS",
  "head_shoulders": "HEAD_SHOULDERS",
  "headshoulders": "HEAD_SHOULDERS",
  
  "double-top-bottom": "DOUBLE_TOP_BOTTOM",
  "double_top_bottom": "DOUBLE_TOP_BOTTOM",
  "doubletopbottom": "DOUBLE_TOP_BOTTOM",
  
  "engulf-at-level": "ENGULF_AT_LEVEL",
  "engulf_at_level": "ENGULF_AT_LEVEL",
  "engulfatlevel": "ENGULF_AT_LEVEL",
  
  "fakeout-trap": "FAKEOUT_TRAP",
  "fakeout_trap": "FAKEOUT_TRAP",
  "fakeouttrap": "FAKEOUT_TRAP",
  
  "flag-pennant": "FLAG_PENNANT",
  "flag_pennant": "FLAG_PENNANT",
  "flagpennant": "FLAG_PENNANT",
  
  "pinbar-at-level": "PINBAR_AT_LEVEL",
  "pinbar_at_level": "PINBAR_AT_LEVEL",
  "pinbaratlevel": "PINBAR_AT_LEVEL",
  
  "rectangle-range-edge": "RECTANGLE_RANGE_EDGE",
  "rectangle_range_edge": "RECTANGLE_RANGE_EDGE",
  "rectanglerangeedge": "RECTANGLE_RANGE_EDGE",
}

// ============================================================
// Normalization Functions
// ============================================================

/**
 * Normalize a single detector ID to canonical form.
 * 
 * Steps:
 * 1. Trim whitespace
 * 2. Replace hyphens/spaces/dots with underscores
 * 3. Check alias mapping
 * 4. Return uppercase canonical form
 * 
 * @param raw - Raw detector ID string
 * @returns Canonical uppercase detector ID
 */
export function normalizeDetectorId(raw: string): string {
  if (!raw || typeof raw !== "string") return ""
  
  // Step 1: Trim and replace separators
  const normalized = raw.trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\./g, "_")
  
  // Step 2: Check alias mapping (case-insensitive)
  const lower = normalized.toLowerCase()
  if (DETECTOR_ALIASES[lower]) {
    return DETECTOR_ALIASES[lower]
  }
  
  // Check uppercase alias too
  const upper = normalized.toUpperCase()
  if (DETECTOR_ALIASES[upper]) {
    return DETECTOR_ALIASES[upper]
  }
  
  // Step 3: Return uppercase
  return upper
}

/**
 * Result of normalizing a list of detector IDs
 */
export interface NormalizeResult {
  /** Original requested IDs */
  requested: string[]
  /** Normalized canonical IDs (unique, valid only) */
  normalized: string[]
  /** IDs that couldn't be mapped to catalog */
  unknown: string[]
  /** Whether any changes were made */
  changed: boolean
}

/**
 * Normalize a list of detector IDs to canonical form.
 * Returns both normalized valid IDs and unknown IDs.
 * 
 * @param detectors - Array of raw detector IDs
 * @returns NormalizeResult with requested, normalized, and unknown arrays
 */
export function normalizeDetectorIds(detectors: string[]): NormalizeResult {
  if (!Array.isArray(detectors)) {
    return { requested: [], normalized: [], unknown: [], changed: false }
  }
  
  const requested = detectors.filter(d => typeof d === "string" && d.trim())
  const seen = new Set<string>()
  const normalized: string[] = []
  const unknown: string[] = []
  
  for (const det of requested) {
    const canonical = normalizeDetectorId(det)
    if (!canonical) continue
    
    // Check if canonical ID is in our catalog
    if (CANONICAL_IDS.has(canonical)) {
      if (!seen.has(canonical)) {
        seen.add(canonical)
        normalized.push(canonical)
      }
    } else {
      // Unknown detector - not in catalog
      if (!unknown.includes(det)) {
        unknown.push(det)
      }
    }
  }
  
  // Check if anything changed (different count or order)
  const changed = requested.length !== normalized.length ||
    requested.some((r, i) => normalizeDetectorId(r) !== normalized[i])
  
  return { requested, normalized, unknown, changed }
}

/**
 * Simple normalization that just returns the canonical IDs list.
 * Drops unknown detectors silently.
 * 
 * @param detectors - Array of raw detector IDs  
 * @returns Array of unique canonical detector IDs
 */
export function normalizeDetectorList(detectors: string[]): string[] {
  return normalizeDetectorIds(detectors).normalized
}

/**
 * Check if a detector ID is valid (exists in catalog after normalization)
 */
export function isValidDetectorId(detectorId: string): boolean {
  const canonical = normalizeDetectorId(detectorId)
  return CANONICAL_IDS.has(canonical)
}

/**
 * Get unknown detectors from a list
 */
export function getUnknownDetectors(detectors: string[]): string[] {
  return normalizeDetectorIds(detectors).unknown
}
