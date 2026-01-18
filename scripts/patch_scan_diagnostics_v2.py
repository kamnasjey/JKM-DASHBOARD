#!/usr/bin/env python3
"""
MEGA PROMPT #5 - Add /scan/diagnostics endpoint and improve hints
"""
import re

FILE = "/opt/JKM-AI-BOT/core/scan_engine_v2.py"

# The new diagnostics endpoint to add after /scan/results
DIAGNOSTICS_ENDPOINT = '''
@scanner_router.get("/diagnostics")
async def get_scan_diagnostics():
    """
    GET /scan/diagnostics
    
    Comprehensive diagnostics endpoint for debugging "why no setups"
    Returns aggregated stats and human-readable explanations.
    """
    scanner = get_scanner()
    status = scanner.status
    results = load_results(100)
    
    # Count market closed vs no data
    reasons = status.noSetupReasons or {}
    market_closed_count = reasons.get("MARKET_CLOSED", 0)
    no_data_count = reasons.get("MARKETDATA_NO_CANDLES", 0) + reasons.get("MARKETDATA_LOW_COVERAGE", 0)
    
    # Build root cause ranking
    top_root_causes = sorted(reasons.items(), key=lambda x: -x[1])[:5]
    
    # Coverage summary from recent results
    coverage_values = []
    for r in results:
        explain = r.get("explain", {})
        cov = explain.get("dataCoverage", {})
        if cov and "pct" in cov:
            coverage_values.append(cov["pct"])
    
    coverage_summary = {
        "min": min(coverage_values) if coverage_values else None,
        "max": max(coverage_values) if coverage_values else None,
        "avg": sum(coverage_values) / len(coverage_values) if coverage_values else None,
        "sampleCount": len(coverage_values),
    }
    
    # TF aggregation hint
    tf_hint = ""
    if status.config and status.config.timeframes:
        tfs = status.config.timeframes
        if any(tf in ["1h", "4h", "1d"] for tf in tfs):
            tf_hint = f"TF={','.join(tfs)} derived from M5 aggregation"
    
    # Market closed explanation
    market_hint = ""
    if market_closed_count > 0:
        forex_count = market_closed_count
        market_hint = f"{forex_count} Forex symbol scans blocked due to weekend (BTCUSD still active)"
    
    # Build human summary
    summary_parts = []
    if market_closed_count > 0:
        summary_parts.append(f"MARKET_CLOSED: {market_closed_count}")
    if no_data_count > 0:
        summary_parts.append(f"NO_DATA: {no_data_count}")
    if status.counters.get("setupsFound", 0) > 0:
        summary_parts.append(f"SETUPS_FOUND: {status.counters['setupsFound']}")
    
    human_summary = " | ".join(summary_parts) if summary_parts else "No activity yet"
    
    return {
        "ok": True,
        "simVersion": SIM_VERSION,
        "running": status.running,
        "runId": status.runId,
        "cycles": status.counters.get("cycles", 0),
        "setupsFound": status.counters.get("setupsFound", 0),
        "errors": status.counters.get("errors", 0),
        "diagnostics": {
            "marketClosedCount": market_closed_count,
            "noDataCount": no_data_count,
            "coverageSummary": coverage_summary,
            "topRootCauses": dict(top_root_causes),
            "tfAggregationHint": tf_hint,
            "marketClosedHint": market_hint,
            "humanSummary": human_summary,
        },
        "lastOutcome": status.lastOutcome,
        "effectiveSymbols": status.config.effectiveSymbols[:15] if status.config else [],
        "timeframes": status.config.timeframes if status.config else [],
        "hints": {
            "tfAggregation": tf_hint,
            "marketClosed": market_hint,
            "dominant": _get_diagnostic_hint(status),
        },
    }
'''

def patch():
    with open(FILE, "r") as f:
        content = f.read()
    
    # Check if already patched
    if "@scanner_router.get(\"/diagnostics\")" in content:
        print("ALREADY PATCHED: /scan/diagnostics endpoint exists")
        return
    
    # Find the /scan/results endpoint and add after it
    # Look for the on_startup function as insertion point
    pattern = r'(# =+\n# Lifecycle Hooks.*?\n# =+)'
    
    match = re.search(pattern, content)
    if match:
        insertion_point = match.start()
        new_content = content[:insertion_point] + DIAGNOSTICS_ENDPOINT + "\n\n" + content[insertion_point:]
        
        with open(FILE, "w") as f:
            f.write(new_content)
        print("PATCHED: Added /scan/diagnostics endpoint")
    else:
        print("ERROR: Could not find insertion point")
        # Try alternative - add before on_startup
        alt_pattern = r'async def on_startup\(\):'
        match = re.search(alt_pattern, content)
        if match:
            insertion_point = match.start()
            new_content = content[:insertion_point] + DIAGNOSTICS_ENDPOINT + "\n\n" + content[insertion_point:]
            with open(FILE, "w") as f:
                f.write(new_content)
            print("PATCHED (alt): Added /scan/diagnostics endpoint")
        else:
            print("ERROR: No insertion point found")

if __name__ == "__main__":
    patch()
