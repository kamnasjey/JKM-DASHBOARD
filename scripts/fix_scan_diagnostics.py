#!/usr/bin/env python3
"""
Patch scan_engine_v2.py to add comprehensive diagnostics
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/scan_engine_v2.py")
s = p.read_text("utf-8")

patched = False

# 1) Enhance /scan/results endpoint to include diagnostic info when empty
old_results = '''@scanner_router.get("/results")
async def get_scan_results(limit: int = 100):
    """Get recent scan results"""
    results = load_results(limit)
    return {"ok": True, "count": len(results), "results": results}'''

new_results = '''@scanner_router.get("/results")
async def get_scan_results(limit: int = 100):
    """Get recent scan results with diagnostic info"""
    results = load_results(limit)
    scanner = get_scanner()
    status = scanner.status
    
    response = {
        "ok": True,
        "count": len(results),
        "results": results,
        "meta": {
            "simVersion": SIM_VERSION,
            "running": status.running,
            "cycles": status.counters.get("cycles", 0),
        },
    }
    
    # Add diagnostic info when no results
    if len(results) == 0:
        response["statusMessage"] = "No setups found yet"
        response["noSetupReasons"] = status.noSetupReasons
        response["lastOutcome"] = status.lastOutcome
        # Generate hint
        hint = ""
        if not status.running:
            hint = "Scanner is not running. Start with POST /scan/start"
        elif status.noSetupReasons:
            dominant = max(status.noSetupReasons, key=status.noSetupReasons.get)
            hint_map = {
                "MARKETDATA_NO_CANDLES": "No market data - check provider",
                "MARKETDATA_LOW_COVERAGE": "Low data coverage (<50%)",
                "MARKET_CLOSED": "Market closed (weekend) or stale data (>2h)",
                "NO_TRIGGER_HITS": "No trigger detectors fired",
                "CONFLUENCE_INSUFFICIENT": "Confluence below minimum",
                "RR_FILTERED_ALL": "RR filter removed all setups",
            }
            hint = hint_map.get(dominant, dominant)
        response["hint"] = hint
    
    return response'''

if old_results in s:
    s = s.replace(old_results, new_results)
    patched = True
    print("PATCHED: /scan/results endpoint with diagnostics")
else:
    print("SKIP: /scan/results pattern not found (may already be patched)")

# 2) Enhance cycle_outcome with more diagnostic fields
old_outcome = '''        cycle_outcome = {
            "cycle": self._status.counters["cycles"],
            "ts": cycle_start.isoformat(),
            "symbolsScanned": 0,
            "setupsFound": 0,
            "rootCause": "OK",
            "noSetupReasons": {},
        }'''

new_outcome = '''        cycle_outcome = {
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

if old_outcome in s:
    s = s.replace(old_outcome, new_outcome)
    patched = True
    print("PATCHED: cycle_outcome with more diagnostic fields")
else:
    print("SKIP: cycle_outcome pattern not found")

# 3) Add diagnosticHint to /scan/status response
# Find and enhance the status return
old_status_tail = '''        "effectiveSymbols": status.config.effectiveSymbols[:15] if status.config else [],
    }'''

new_status_tail = '''        "effectiveSymbols": status.config.effectiveSymbols[:15] if status.config else [],
        "diagnosticHint": _get_diagnostic_hint(status),
    }

def _get_diagnostic_hint(status) -> str:
    """Generate human-readable hint for why no setups"""
    if not status.running:
        return "Scanner is not running"
    
    reasons = status.noSetupReasons
    if not reasons:
        return "Scanner running - waiting for first cycle"
    
    dominant = max(reasons, key=reasons.get) if reasons else None
    
    hints = {
        "MARKETDATA_NO_CANDLES": "No market data available - check data provider",
        "MARKETDATA_LOW_COVERAGE": "Insufficient data coverage (<50%)",
        "MARKET_CLOSED": "Market is closed (weekend) or data is stale (>2h old)",
        "GATES_BLOCKED_ALL": "Gate detectors are blocking all entries",
        "NO_TRIGGER_HITS": "No trigger detectors fired on recent bars",
        "CONFLUENCE_INSUFFICIENT": "Not enough confluence signals",
        "RR_FILTERED_ALL": "All potential setups filtered by RR requirement",
    }
    
    return hints.get(dominant, f"Reason: {dominant}")'''

if old_status_tail in s:
    s = s.replace(old_status_tail, new_status_tail)
    patched = True
    print("PATCHED: /scan/status with diagnosticHint")
else:
    print("SKIP: status tail pattern not found")

if patched:
    p.write_text(s, "utf-8")
    print("DONE - File saved")
else:
    print("NO CHANGES - patterns may already be applied")
