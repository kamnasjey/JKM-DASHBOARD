#!/usr/bin/env python3
"""
Patch scan_engine_v2.py: bridge_get_coverage should check M5 for higher TFs
Since we aggregate M5 -> H1/H4, coverage should be based on M5 availability
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/scan_engine_v2.py")
s = p.read_text("utf-8")

old_coverage = '''def bridge_get_coverage(symbol: str, from_dt: datetime, to_dt: datetime, tf: str = "5m") -> CoverageInfo:
    """Get coverage info for explain blocks."""
    store = _get_market_store()
    if store is None:
        return CoverageInfo()
    try:
        info = store.check_coverage(symbol, from_dt, to_dt, tf)
        return info'''

new_coverage = '''def bridge_get_coverage(symbol: str, from_dt: datetime, to_dt: datetime, tf: str = "5m") -> CoverageInfo:
    """Get coverage info for explain blocks.
    
    For higher TFs (H1, H4), check M5 coverage since we aggregate from M5.
    """
    store = _get_market_store()
    if store is None:
        return CoverageInfo()
    try:
        # For higher TFs, check M5 coverage since we aggregate M5 -> target TF
        check_tf = "5m" if tf.lower() in ("h1", "1h", "h4", "4h", "d1", "1d") else tf
        info = store.check_coverage(symbol, from_dt, to_dt, check_tf)
        return info'''

if old_coverage in s:
    s = s.replace(old_coverage, new_coverage)
    p.write_text(s, "utf-8")
    print("PATCHED: bridge_get_coverage now checks M5 for higher TFs")
else:
    print("ERROR: Pattern not found")
