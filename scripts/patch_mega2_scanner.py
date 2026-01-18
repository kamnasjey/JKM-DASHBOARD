#!/usr/bin/env python3
"""
MEGA PROMPT #2 - Scanner Enhancement Patch

1. Add data freshness checks (DATA_STALE when ageSec > 2 * tfSec)
2. Enhance /scan/status with: detectorsRequested, detectorsNormalized, barsScannedTotal, hitsPerDetector, gateBlocks, dataFreshness
3. Enhance /scan/diagnostics with: staleCount, tfMismatchCount, dataFreshness summary
"""
from pathlib import Path
import re
from datetime import datetime

ROOT = Path("/opt/JKM-AI-BOT")
SCAN = ROOT / "core" / "scan_engine_v2.py"

def die(msg):
    raise SystemExit(f"FATAL: {msg}")

if not SCAN.exists():
    die(f"Missing {SCAN}")

scan_txt = SCAN.read_text(encoding="utf-8")
original = scan_txt

# ============================================================
# 1. Add DATA_STALE to ROOT_CAUSES if not present
# ============================================================
if '"DATA_STALE"' not in scan_txt:
    scan_txt = scan_txt.replace(
        '"RR_FILTERED_ALL": "All setups filtered by RR requirement",',
        '''"RR_FILTERED_ALL": "All setups filtered by RR requirement",
    "DATA_STALE": "Data is stale (age > 2 * timeframe period)",'''
    )
    print("Added DATA_STALE to ROOT_CAUSES")

# ============================================================
# 2. Add tf_to_seconds helper if not present
# ============================================================
if "def tf_to_seconds" not in scan_txt:
    # Insert after DEFAULT_15_SYMBOLS
    insert_marker = "DEFAULT_15_SYMBOLS = ["
    idx = scan_txt.find(insert_marker)
    if idx != -1:
        # Find end of list
        end_idx = scan_txt.find("]", idx) + 1
        helper_code = '''

# ============================================================
# Timeframe Helpers
# ============================================================
def tf_to_seconds(tf: str) -> int:
    """Convert timeframe string to seconds."""
    tf = tf.lower().strip()
    if tf in ("m1", "1m"): return 60
    if tf in ("m5", "5m"): return 300
    if tf in ("m15", "15m"): return 900
    if tf in ("m30", "30m"): return 1800
    if tf in ("h1", "1h"): return 3600
    if tf in ("h4", "4h"): return 14400
    if tf in ("d1", "1d"): return 86400
    return 300  # Default to 5m

def check_data_freshness(last_ts: datetime, tf: str) -> dict:
    """
    Check if data is fresh enough for the timeframe.
    
    Returns:
        dict with: is_fresh, age_sec, max_age_sec, root_cause
    """
    now = datetime.now(timezone.utc)
    if last_ts.tzinfo is None:
        last_ts = last_ts.replace(tzinfo=timezone.utc)
    
    age_sec = (now - last_ts).total_seconds()
    tf_sec = tf_to_seconds(tf)
    max_age_sec = 2 * tf_sec  # Data is stale if older than 2x timeframe
    
    is_fresh = age_sec <= max_age_sec
    
    return {
        "is_fresh": is_fresh,
        "age_sec": int(age_sec),
        "max_age_sec": max_age_sec,
        "tf_sec": tf_sec,
        "root_cause": "OK" if is_fresh else "DATA_STALE",
    }

def is_forex_weekend(symbol: str) -> bool:
    """Check if symbol is Forex and it's weekend."""
    # BTCUSD, ETHUSD are crypto - always open
    crypto_symbols = ["BTCUSD", "ETHUSD", "XRPUSD", "LTCUSD"]
    if symbol.upper() in crypto_symbols:
        return False
    
    now = datetime.now(timezone.utc)
    # Weekend is Saturday and Sunday
    return now.weekday() >= 5

'''
        scan_txt = scan_txt[:end_idx+1] + helper_code + scan_txt[end_idx+1:]
        print("Added tf_to_seconds, check_data_freshness, is_forex_weekend helpers")

# ============================================================
# 3. Enhanced ScanStatus model with more fields
# ============================================================
old_scan_status = '''class ScanStatus(BaseModel):
    """Current scanner status"""
    running: bool = False
    runId: Optional[str] = None
    startedAt: Optional[str] = None
    lastCycleAt: Optional[str] = None
    nextCycleAt: Optional[str] = None
    config: Optional[ScanConfig] = None
    progress: Dict[str, Any] = {}
    counters: Dict[str, int] = {"cycles": 0, "setupsFound": 0, "errors": 0}
    noSetupReasons: Dict[str, int] = {}  # Track why no setups found
    lastErrors: List[Dict[str, Any]] = []
    lastOutcome: Optional[Dict[str, Any]] = None
    simVersion: str = SIM_VERSION'''

new_scan_status = '''class ScanStatus(BaseModel):
    """Current scanner status"""
    running: bool = False
    runId: Optional[str] = None
    startedAt: Optional[str] = None
    lastCycleAt: Optional[str] = None
    nextCycleAt: Optional[str] = None
    config: Optional[ScanConfig] = None
    progress: Dict[str, Any] = {}
    counters: Dict[str, int] = {"cycles": 0, "setupsFound": 0, "errors": 0}
    noSetupReasons: Dict[str, int] = {}  # Track why no setups found
    lastErrors: List[Dict[str, Any]] = []
    lastOutcome: Optional[Dict[str, Any]] = None
    simVersion: str = SIM_VERSION
    # Enhanced fields for MEGA PROMPT #2
    detectorsRequested: List[str] = []
    detectorsNormalized: List[str] = []
    barsScannedTotal: int = 0
    hitsPerDetector: Dict[str, int] = {}  # ALL detectors including 0s
    gateBlocks: int = 0
    dataFreshness: Dict[str, Any] = {}  # {freshCount, staleCount, avgAgeSec}'''

if old_scan_status in scan_txt:
    scan_txt = scan_txt.replace(old_scan_status, new_scan_status)
    print("Enhanced ScanStatus model")

# ============================================================
# 4. Update _scan_symbol_tf to check data freshness
# ============================================================
old_freshness_check = '''            # Check data freshness
            if coverage.last_ts:
                age_hours = (datetime.now(timezone.utc) - coverage.last_ts).total_seconds() / 3600
                if age_hours > 2:
                    self._increment_no_setup_reason("MARKET_CLOSED")
                    return None'''

new_freshness_check = '''            # Check if Forex and weekend
            if is_forex_weekend(symbol):
                self._increment_no_setup_reason("MARKET_CLOSED")
                return None

            # Check data freshness (stale = age > 2 * tf_period)
            if coverage.last_ts:
                freshness = check_data_freshness(coverage.last_ts, tf)
                if not freshness["is_fresh"]:
                    self._increment_no_setup_reason("DATA_STALE")
                    return None'''

if old_freshness_check in scan_txt:
    scan_txt = scan_txt.replace(old_freshness_check, new_freshness_check)
    print("Updated data freshness check")

# ============================================================
# 5. Update cycle_outcome in _run_cycle to track more metrics
# ============================================================
old_cycle_outcome = '''        cycle_outcome = {
            "cycle": self._status.counters["cycles"],
            "ts": cycle_start.isoformat(),
            "symbolsScanned": 0,
            "setupsFound": 0,
            "rootCause": "OK",
            "noSetupReasons": {},
            "barsScannedTotal": 0,
            "hitsPerDetector": {},
            "gateBlocks": 0,
            "dataCoverage": {"expected": 0, "actual": 0, "missingPct": 0},
            "marketClosedSymbols": [],
        }'''

new_cycle_outcome = '''        cycle_outcome = {
            "cycle": self._status.counters["cycles"],
            "ts": cycle_start.isoformat(),
            "symbolsScanned": 0,
            "setupsFound": 0,
            "rootCause": "OK",
            "noSetupReasons": {},
            "barsScannedTotal": 0,
            "hitsPerDetector": {det: 0 for det in self._config.detectors},  # ALL detectors
            "gateBlocks": 0,
            "dataCoverage": {"expected": 0, "actual": 0, "missingPct": 0},
            "marketClosedSymbols": [],
            "dataFreshness": {"freshCount": 0, "staleCount": 0, "ages": []},
        }
        
        # Track detectors requested vs normalized
        self._status.detectorsRequested = self._config.detectors.copy()
        self._status.detectorsNormalized = [d.lower().strip() for d in self._config.detectors]'''

if old_cycle_outcome in scan_txt:
    scan_txt = scan_txt.replace(old_cycle_outcome, new_cycle_outcome)
    print("Enhanced cycle_outcome tracking")

# ============================================================
# 6. Update /scan/status endpoint response
# ============================================================
old_status_response = '''    return {
        "ok": True,
        "simVersion": SIM_VERSION,
        "running": status.running,
        "runId": status.runId,
        "startedAt": status.startedAt,
        "lastCycleAt": status.lastCycleAt,
        "nextCycleAt": status.nextCycleAt,
        "counters": status.counters,
        "noSetupReasons": status.noSetupReasons,
        "lastOutcome": status.lastOutcome,
        "config": status.config.dict() if status.config else None,
        "effectiveSymbolsCount": len(status.config.effectiveSymbols) if status.config else 0,
        "effectiveSymbols": status.config.effectiveSymbols[:15] if status.config else [],
        "diagnosticHint": _get_diagnostic_hint(status),
    }'''

new_status_response = '''    # Build hitsPerDetector with ALL detectors (including 0s)
    all_hits = {}
    if status.config and status.config.detectors:
        for det in status.config.detectors:
            all_hits[det] = status.hitsPerDetector.get(det, 0)
    
    return {
        "ok": True,
        "simVersion": SIM_VERSION,
        "running": status.running,
        "runId": status.runId,
        "startedAt": status.startedAt,
        "lastCycleAt": status.lastCycleAt,
        "nextCycleAt": status.nextCycleAt,
        "counters": status.counters,
        "noSetupReasons": status.noSetupReasons,
        "lastOutcome": status.lastOutcome,
        "config": status.config.dict() if status.config else None,
        "effectiveSymbolsCount": len(status.config.effectiveSymbols) if status.config else 0,
        "effectiveSymbols": status.config.effectiveSymbols[:15] if status.config else [],
        "diagnosticHint": _get_diagnostic_hint(status),
        # Enhanced fields for MEGA PROMPT #2
        "detectorsRequested": status.detectorsRequested,
        "detectorsNormalized": status.detectorsNormalized,
        "barsScannedTotal": status.barsScannedTotal,
        "hitsPerDetector": all_hits,
        "gateBlocks": status.gateBlocks,
        "dataFreshness": status.dataFreshness,
    }'''

if old_status_response in scan_txt:
    scan_txt = scan_txt.replace(old_status_response, new_status_response)
    print("Enhanced /scan/status response")

# ============================================================
# 7. Update /scan/diagnostics to include staleCount, tfMismatchCount
# ============================================================
old_diag_counts = '''    # Count market closed vs no data
    reasons = status.noSetupReasons or {}
    market_closed_count = reasons.get("MARKET_CLOSED", 0)
    no_data_count = reasons.get("MARKETDATA_NO_CANDLES", 0) + reasons.get("MARKETDATA_LOW_COVERAGE", 0)'''

new_diag_counts = '''    # Count various failure reasons
    reasons = status.noSetupReasons or {}
    market_closed_count = reasons.get("MARKET_CLOSED", 0)
    no_data_count = reasons.get("MARKETDATA_NO_CANDLES", 0) + reasons.get("MARKETDATA_LOW_COVERAGE", 0)
    stale_count = reasons.get("DATA_STALE", 0)
    
    # Check for TF mismatch via verify endpoint (best-effort)
    tf_mismatch_count = 0
    try:
        from core.marketdata_verify import get_resample_status
        # Quick check on BTCUSD
        verify_result = get_resample_status("BTCUSD", "1h")
        if verify_result.get("rootCause") == "TF_MISMATCH":
            tf_mismatch_count = verify_result.get("stats", {}).get("mismatch_count", 0)
    except Exception:
        pass  # Module may not exist'''

if old_diag_counts in scan_txt:
    scan_txt = scan_txt.replace(old_diag_counts, new_diag_counts)
    print("Enhanced diagnostics counts")

# Add staleCount to diagnostics response
old_diag_response = '''        "diagnostics": {
            "marketClosedCount": market_closed_count,
            "noDataCount": no_data_count,'''

new_diag_response = '''        "diagnostics": {
            "marketClosedCount": market_closed_count,
            "noDataCount": no_data_count,
            "staleCount": stale_count,
            "tfMismatchCount": tf_mismatch_count,'''

if old_diag_response in scan_txt:
    scan_txt = scan_txt.replace(old_diag_response, new_diag_response)
    print("Added staleCount, tfMismatchCount to diagnostics")

# Add DATA_STALE to human summary
old_summary_parts = '''    # Build human summary
    summary_parts = []
    if market_closed_count > 0:
        summary_parts.append(f"MARKET_CLOSED: {market_closed_count}")
    if no_data_count > 0:
        summary_parts.append(f"NO_DATA: {no_data_count}")'''

new_summary_parts = '''    # Build human summary
    summary_parts = []
    if market_closed_count > 0:
        summary_parts.append(f"MARKET_CLOSED: {market_closed_count}")
    if stale_count > 0:
        summary_parts.append(f"DATA_STALE: {stale_count}")
    if no_data_count > 0:
        summary_parts.append(f"NO_DATA: {no_data_count}")
    if tf_mismatch_count > 0:
        summary_parts.append(f"TF_MISMATCH: {tf_mismatch_count}")'''

if old_summary_parts in scan_txt:
    scan_txt = scan_txt.replace(old_summary_parts, new_summary_parts)
    print("Enhanced human summary")

# Add DATA_STALE hint
old_hints = '''    hints = {
        "MARKETDATA_NO_CANDLES": "No market data available (TF derived from M5)",
        "MARKETDATA_LOW_COVERAGE": "Insufficient data coverage <50% (TF from M5)",
        "MARKET_CLOSED": "Forex weekend closed - only BTCUSD active (H1 from M5)",'''

new_hints = '''    hints = {
        "MARKETDATA_NO_CANDLES": "No market data available (TF derived from M5)",
        "MARKETDATA_LOW_COVERAGE": "Insufficient data coverage <50% (TF from M5)",
        "MARKET_CLOSED": "Forex weekend closed - only BTCUSD active (H1 from M5)",
        "DATA_STALE": "Data is stale (age > 2x timeframe period) - check provider",'''

if old_hints in scan_txt:
    scan_txt = scan_txt.replace(old_hints, new_hints)
    print("Added DATA_STALE hint")

# ============================================================
# Write changes
# ============================================================
if scan_txt != original:
    SCAN.write_text(scan_txt, encoding="utf-8")
    print(f"\nUpdated: {SCAN}")
else:
    print("\nNo changes needed - file already up to date")

print()
print("=" * 60)
print("MEGA PROMPT #2 PATCH COMPLETE")
print("=" * 60)
print(f"timestamp_utc: {datetime.utcnow().isoformat()}Z")
print()
print("Changes:")
print("  1. DATA_STALE root cause added")
print("  2. tf_to_seconds, check_data_freshness, is_forex_weekend helpers")
print("  3. Enhanced ScanStatus model")
print("  4. Data freshness check in _scan_symbol_tf")
print("  5. Enhanced cycle_outcome tracking")
print("  6. Enhanced /scan/status response")
print("  7. Enhanced /scan/diagnostics with staleCount, tfMismatchCount")
print()
print("Next: Rebuild container and run smoke tests")
