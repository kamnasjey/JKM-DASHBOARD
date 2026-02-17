/**
 * Signal Types — Re-export from unified module
 *
 * This file exists so that consumers (e.g. SignalsContext) can import
 * from "@/lib/signals/types" while the canonical definitions live in
 * "@/lib/signals/unified".
 */

export type {
  UnifiedSignal,
  ScannerResult,
} from "./unified"

export {
  mapScannerResultToUnified,
  mapOldSignalToUnified,
  mergeSignals,
  hasLowCoverage,
  getConfidenceLevel,
  formatDirection,
  formatTimestamp,
} from "./unified"
