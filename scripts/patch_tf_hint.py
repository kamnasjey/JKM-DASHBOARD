#!/usr/bin/env python3
"""
MEGA PROMPT #5C - Enhance diagnostic hints with TF aggregation info
"""

FILE = "/opt/JKM-AI-BOT/core/scan_engine_v2.py"

OLD_HINT_FUNC = '''def _get_diagnostic_hint(status) -> str:
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

NEW_HINT_FUNC = '''def _get_diagnostic_hint(status) -> str:
    """Generate human-readable hint for why no setups"""
    if not status.running:
        return "Scanner is not running"

    reasons = status.noSetupReasons
    if not reasons:
        return "Scanner running - waiting for first cycle"

    dominant = max(reasons, key=reasons.get) if reasons else None
    
    # Build TF aggregation hint
    tf_info = ""
    if status.config and status.config.timeframes:
        tfs = status.config.timeframes
        higher_tfs = [tf for tf in tfs if tf in ["1h", "4h", "1d"]]
        if higher_tfs:
            tf_info = f" (TF={','.join(tfs)} derived from M5 aggregation)"

    hints = {
        "MARKETDATA_NO_CANDLES": f"No market data available{tf_info}",
        "MARKETDATA_LOW_COVERAGE": f"Insufficient data coverage (<50%){tf_info}",
        "MARKET_CLOSED": f"Forex weekend - only BTCUSD active{tf_info}",
        "GATES_BLOCKED_ALL": "Gate detectors blocking all entries",
        "NO_TRIGGER_HITS": "No trigger detectors fired on recent bars",
        "CONFLUENCE_INSUFFICIENT": "Not enough confluence signals",
        "RR_FILTERED_ALL": "All potential setups filtered by RR requirement",
    }

    return hints.get(dominant, f"Reason: {dominant}{tf_info}")'''

def patch():
    with open(FILE, "r") as f:
        content = f.read()
    
    if "(TF=" in content and "M5 aggregation" in content:
        print("ALREADY PATCHED: TF aggregation hint exists")
        return
    
    if OLD_HINT_FUNC in content:
        new_content = content.replace(OLD_HINT_FUNC, NEW_HINT_FUNC)
        with open(FILE, "w") as f:
            f.write(new_content)
        print("PATCHED: Enhanced _get_diagnostic_hint with TF aggregation info")
    else:
        print("WARNING: Old hint function pattern not found - may already be modified")
        # Try to find and show current version
        import re
        match = re.search(r'def _get_diagnostic_hint\(status\)[^}]+?return hints\.get\([^)]+\)', content, re.DOTALL)
        if match:
            print("Current version found at:", match.start())
            print(match.group()[:200])

if __name__ == "__main__":
    patch()
