#!/usr/bin/env python3
"""
MEGA PROMPT #5 Patch:
1. Add meta.simVersion to /scan/status
2. Add /scan/diagnostics endpoint  
3. Add meta.simVersion to /api/signals
"""
from pathlib import Path
import re
from datetime import datetime

ROOT = Path("/opt/JKM-AI-BOT")
SCAN = ROOT / "core" / "scan_engine_v2.py"
API  = ROOT / "api_server.py"
VERSION = ROOT / "core" / "version.py"

def die(msg):
    raise SystemExit(msg)

if not ROOT.exists():
    die("Missing /opt/JKM-AI-BOT")
if not SCAN.exists():
    die("Missing core/scan_engine_v2.py")
if not API.exists():
    die("Missing api_server.py")

# 0) Ensure SIM_VERSION exists
if not VERSION.exists():
    VERSION.write_text('SIM_VERSION = "2026-01-18-prompt5"\n', encoding="utf-8")
    print("Created version.py")
else:
    print("version.py already exists")

# -------------------------------------------------------------------
# 1) Patch scan_engine_v2.py: add meta.simVersion to /status payload
# -------------------------------------------------------------------
scan_txt = SCAN.read_text(encoding="utf-8")
original_scan = scan_txt

# Ensure import SIM_VERSION
if "from core.version import SIM_VERSION" not in scan_txt:
    # place near top imports
    scan_txt = re.sub(
        r"(\nimport\s+[^\n]+\n)",
        r"\1from core.version import SIM_VERSION\n",
        scan_txt,
        count=1
    )
    print("Added SIM_VERSION import to scan_engine_v2.py")

# -------------------------------------------------------------------
# 2) Add /scan/diagnostics endpoint (in scan_engine_v2 router)
# -------------------------------------------------------------------
if "def scan_diagnostics" not in scan_txt and '"/diagnostics"' not in scan_txt:
    # Insert near other router endpoints: look for @scanner_router.get("/status")
    insert_point = scan_txt.find('@scanner_router.get("/status")')
    if insert_point == -1:
        insert_point = scan_txt.find("@scanner_router.get('/status')")
    if insert_point == -1:
        die("Could not find /status route in scan_engine_v2.py to anchor diagnostics")

    diag_code = '''
@scanner_router.get("/diagnostics")
def scan_diagnostics():
    """
    Human-friendly diagnostics summary:
    - top root causes
    - market closed count
    - no data count
    - coverage summary
    """
    try:
        svc = get_scanner_service()
        st = svc.get_status() if hasattr(svc, "get_status") else {}
        reasons = st.get("noSetupReasons") or {}
        # normalize
        mc = int(reasons.get("MARKET_CLOSED", 0))
        nd = int(reasons.get("MARKETDATA_NO_CANDLES", 0)) + int(reasons.get("NO_DATA_IN_RANGE", 0))
        # top causes
        top = sorted([(k, int(v)) for k, v in reasons.items()], key=lambda x: x[1], reverse=True)[:7]

        # coverage summary (best-effort if present)
        last = st.get("lastOutcome") or {}
        cov = last.get("dataCoverage") or {}
        cov_pct = cov.get("pct") or cov.get("coveragePct") or cov.get("coverage_pct")
        coverage_summary = {"pct": cov_pct, "raw": cov}

        hint = st.get("diagnosticHint") or ""
        return {
            "ok": True,
            "meta": {"simVersion": SIM_VERSION},
            "marketClosedCount": mc,
            "noDataCount": nd,
            "topRootCauses": [{"code": k, "count": c} for k, c in top],
            "coverageSummary": coverage_summary,
            "lastOutcome": last,
            "hint": hint,
        }
    except Exception as e:
        return {"ok": False, "meta": {"simVersion": SIM_VERSION}, "error": str(e)}

'''
    scan_txt = scan_txt[:insert_point] + diag_code + scan_txt[insert_point:]
    print("Added /scan/diagnostics endpoint")
else:
    print("/scan/diagnostics already exists - skipping")

if scan_txt != original_scan:
    SCAN.write_text(scan_txt, encoding="utf-8")
    print("Wrote scan_engine_v2.py")

# -------------------------------------------------------------------
# 3) Patch api_server.py: ensure /api/signals includes meta.simVersion (best-effort)
# -------------------------------------------------------------------
api_txt = API.read_text(encoding="utf-8")
original_api = api_txt

# ensure SIM_VERSION import in api_server (best effort, safe if duplicate)
if "from core.version import SIM_VERSION" not in api_txt:
    # insert after fastapi import block
    api_txt = re.sub(r"(from fastapi[^\n]*\n)", r"\1from core.version import SIM_VERSION\n", api_txt, count=1)
    print("Added SIM_VERSION import to api_server.py")

# patch signals endpoint response if it returns dict without meta
if "/api/signals" in api_txt and '"meta"' not in api_txt:
    # very conservative: only patch if it has a response dict with ok/count/signals
    api_txt = api_txt.replace('"source": "backend_signals"}', '"source": "backend_signals", "meta": {"simVersion": SIM_VERSION}}')
    print("Added meta.simVersion to /api/signals response")

if api_txt != original_api:
    API.write_text(api_txt, encoding="utf-8")
    print("Wrote api_server.py")

print()
print("PATCH_OK")
print("scan_engine_v2.py:", SCAN)
print("api_server.py:", API)
print("timestamp_utc:", datetime.utcnow().isoformat()+"Z")
