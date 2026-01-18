#!/usr/bin/env python3
"""
Fix: Use has_coverage instead of check_coverage
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/scan_engine_v2.py")
s = p.read_text("utf-8")

# Replace check_coverage with has_coverage
if "store.check_coverage" in s:
    s = s.replace("store.check_coverage", "store.has_coverage")
    p.write_text(s, "utf-8")
    print("PATCHED: Changed check_coverage to has_coverage")
else:
    print("Already using has_coverage or pattern not found")
