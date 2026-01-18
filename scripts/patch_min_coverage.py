#!/usr/bin/env python3
"""
Fix: Lower min_coverage_pct for bridge_get_coverage to work on weekends
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/scan_engine_v2.py")
s = p.read_text("utf-8")

old = '''        # For higher TFs, check M5 coverage since we aggregate M5 -> target TF
        check_tf = "5m" if tf.lower() in ("h1", "1h", "h4", "4h", "d1", "1d") else tf
        info = store.check_coverage(symbol, from_dt, to_dt, check_tf)
        return info'''

new = '''        # For higher TFs, check M5 coverage since we aggregate M5 -> target TF
        check_tf = "5m" if tf.lower() in ("h1", "1h", "h4", "4h", "d1", "1d") else tf
        # Use low min_coverage (10%) to work during weekends when Forex has no data
        info = store.check_coverage(symbol, from_dt, to_dt, check_tf, min_coverage_pct=10.0)
        return info'''

if old in s:
    s = s.replace(old, new)
    p.write_text(s, "utf-8")
    print("PATCHED: bridge_get_coverage now uses min_coverage_pct=10")
else:
    print("ERROR: Pattern not found")
