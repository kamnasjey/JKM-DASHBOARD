#!/usr/bin/env python3
"""
MEGA PROMPT #1 - MarketData Canonical Contract + Resample Verification

1. Update aggregate_ohlc() with UTC bucket alignment + complete window policy
2. Create marketdata_verify.py for resample verification
3. Add /api/marketdata/verify endpoint to api_server.py
"""
from pathlib import Path
import re
from datetime import datetime

ROOT = Path("/opt/JKM-AI-BOT")
BRIDGE = ROOT / "core" / "market_data_bridge.py"
VERIFY = ROOT / "core" / "marketdata_verify.py"
API = ROOT / "api_server.py"

def die(msg):
    raise SystemExit(f"FATAL: {msg}")

if not ROOT.exists():
    die("Missing /opt/JKM-AI-BOT")

# ============================================================
# 1. Update market_data_bridge.py with strict window policy
# ============================================================

bridge_txt = BRIDGE.read_text(encoding="utf-8")

# Add RESAMPLE_GRID constant near top if not present
if "RESAMPLE_GRID" not in bridge_txt:
    # Find after logger definition
    insert_after = "logger = logging.getLogger(__name__)"
    if insert_after in bridge_txt:
        bridge_txt = bridge_txt.replace(
            insert_after,
            insert_after + """

# ============================================================
# Resample Configuration
# ============================================================
RESAMPLE_GRID = "UTC"  # All bucket alignment uses UTC midnight
STRICT_WINDOW_POLICY = True  # Only emit candles for complete windows
"""
        )
        print("Added RESAMPLE_GRID and STRICT_WINDOW_POLICY constants")


# Replace the aggregate_ohlc function with enhanced version
OLD_AGG_START = '''def aggregate_ohlc(
    candles: List[Dict[str, Any]],
    from_tf: str,
    to_tf: str
) -> List[Dict[str, Any]]:'''

NEW_AGG_FUNC = '''def bucket_start_utc(ts: int, period_sec: int) -> int:
    """
    Compute UTC-aligned bucket start for given timestamp.
    E.g., for 1h (3600s): ts 1705582200 -> bucket 1705579200 (00:00 UTC hour)
    """
    return (ts // period_sec) * period_sec


def aggregate_ohlc(
    candles: List[Dict[str, Any]],
    from_tf: str,
    to_tf: str,
    strict: bool = True,
    now_ts: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Aggregate candles from smaller to larger timeframe with UTC bucket alignment.

    E.g., M5 candles -> H1 candles (12 M5 = 1 H1)

    Args:
        candles: List of OHLCV candles
        from_tf: Source timeframe (e.g., "m5")
        to_tf: Target timeframe (e.g., "h1")
        strict: If True, only emit complete windows (default: True)
        now_ts: Current timestamp for partial window detection (optional)

    Returns:
        List of aggregated candles with: time, open, high, low, close, volume, _complete
    """
    if not candles:
        return []

    from_sec = tf_to_seconds(from_tf)
    to_sec = tf_to_seconds(to_tf)

    if to_sec <= from_sec:
        return candles  # No aggregation needed

    # Calculate expected candles per window
    candles_per_window = to_sec // from_sec  # e.g., 12 for M5->H1

    if now_ts is None:
        now_ts = int(datetime.now(timezone.utc).timestamp())

    out = []
    buckets: Dict[int, Dict[str, Any]] = {}

    for c in candles:
        # Get timestamp
        ts_raw = c.get("time") or c.get("ts") or c.get("t") or c.get("timestamp")
        ts = _candle_ts_to_int(ts_raw)
        bs = bucket_start_utc(ts, to_sec)

        # Get OHLCV
        o = float(c.get("open") or c.get("o") or 0)
        h = float(c.get("high") or c.get("h") or 0)
        l = float(c.get("low") or c.get("l") or 0)
        cl = float(c.get("close") or c.get("c") or 0)
        v = float(c.get("volume") or c.get("v") or 0)

        if bs not in buckets:
            buckets[bs] = {
                "bucket_ts": bs,
                "open": o,
                "high": h,
                "low": l,
                "close": cl,
                "volume": v,
                "candle_count": 1,
            }
        else:
            b = buckets[bs]
            b["high"] = max(b["high"], h)
            b["low"] = min(b["low"], l)
            b["close"] = cl
            b["volume"] += v
            b["candle_count"] += 1

    # Emit candles, respecting strict window policy
    for bs in sorted(buckets.keys()):
        b = buckets[bs]
        is_complete = b["candle_count"] >= candles_per_window
        is_current_window = (bs + to_sec) > now_ts

        # Skip incomplete windows if strict mode (except for "live" current window)
        if strict and not is_complete and not is_current_window:
            logger.debug(f"Skipping incomplete bucket {_ts_to_iso(bs)}: {b['candle_count']}/{candles_per_window} candles")
            continue

        out.append({
            "time": _ts_to_iso(b["bucket_ts"]),
            "open": b["open"],
            "high": b["high"],
            "low": b["low"],
            "close": b["close"],
            "volume": b["volume"],
            "_complete": is_complete,
            "_candle_count": b["candle_count"],
            "_expected_count": candles_per_window,
        })

    logger.debug(f"Aggregated {len(candles)} {from_tf} candles -> {len(out)} {to_tf} candles (strict={strict})")
    return out'''

if OLD_AGG_START in bridge_txt:
    # Find the full function and replace it
    # Look for the function and everything until the next def or class
    pattern = re.compile(
        r'def aggregate_ohlc\(\s*candles:.*?\n\s*logger\.debug\(f"Aggregated.*?\n    return out\n',
        re.DOTALL
    )
    if pattern.search(bridge_txt):
        bridge_txt = pattern.sub(NEW_AGG_FUNC + "\n\n", bridge_txt)
        print("Replaced aggregate_ohlc with UTC-aligned version")
    else:
        print("WARNING: Could not find aggregate_ohlc function boundary")
else:
    print("NOTE: aggregate_ohlc signature changed or not found")

# Ensure Dict is imported
if "from typing import" in bridge_txt and "Dict" not in bridge_txt.split("from typing import")[1].split("\n")[0]:
    bridge_txt = bridge_txt.replace(
        "from typing import Any,",
        "from typing import Any, Dict,"
    )

BRIDGE.write_text(bridge_txt, encoding="utf-8")
print(f"Updated: {BRIDGE}")

# ============================================================
# 2. Create marketdata_verify.py
# ============================================================

verify_code = '''"""
marketdata_verify.py
--------------------
Verification utilities for M5 -> higher TF resample accuracy.

Compares resampled candles against provider-native candles (if available)
or performs internal consistency checks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Tolerance for price comparison (0.0001 = 0.01% = 1 pip for most pairs)
DEFAULT_TOLERANCE = 0.0001


def verify_resample(
    symbol: str,
    tf: str,
    days: int = 7,
    tolerance: float = DEFAULT_TOLERANCE,
) -> Dict[str, Any]:
    """
    Verify M5 -> TF resample accuracy.

    Args:
        symbol: Trading symbol (e.g., "BTCUSD")
        tf: Target timeframe (e.g., "1h", "4h")
        days: Lookback days
        tolerance: Price difference tolerance (fraction)

    Returns:
        Dict with verification results:
        - ok: bool
        - grid: "UTC"
        - windowCompletePolicy: "strict" | "lenient"
        - mismatches: list of mismatch details
        - stats: {total_candles, complete_candles, mismatch_count, max_abs_diff}
        - suggestion: str
    """
    from core.market_data_bridge import (
        get_candles,
        aggregate_ohlc,
        tf_to_seconds,
        bucket_start_utc,
        RESAMPLE_GRID,
        STRICT_WINDOW_POLICY,
    )

    result = {
        "ok": True,
        "grid": RESAMPLE_GRID if "RESAMPLE_GRID" in dir() else "UTC",
        "windowCompletePolicy": "strict" if STRICT_WINDOW_POLICY else "lenient",
        "symbol": symbol,
        "timeframe": tf,
        "days": days,
        "tolerance": tolerance,
        "mismatches": [],
        "stats": {
            "total_candles": 0,
            "complete_candles": 0,
            "incomplete_candles": 0,
            "mismatch_count": 0,
            "max_abs_diff": 0.0,
            "first_mismatch_ts": None,
        },
        "suggestion": None,
        "rootCause": "OK",
    }

    try:
        to_dt = datetime.now(timezone.utc)
        from_dt = to_dt - timedelta(days=days)

        # Get M5 candles
        m5_candles = get_candles(symbol, from_dt, to_dt, "m5")

        if not m5_candles:
            result["ok"] = False
            result["rootCause"] = "NO_M5_DATA"
            result["suggestion"] = f"No M5 data for {symbol}. Run backfill or check if market is closed."
            return result

        # Check if it's weekend for Forex
        is_forex = symbol.upper() not in ["BTCUSD", "ETHUSD", "XRPUSD"]
        if is_forex and to_dt.weekday() >= 5:  # Saturday or Sunday
            result["rootCause"] = "MARKET_CLOSED"
            result["suggestion"] = f"{symbol} is a Forex pair. Market closed on weekends."

        # Resample M5 -> target TF
        resampled = aggregate_ohlc(m5_candles, "m5", tf, strict=True)

        result["stats"]["total_candles"] = len(resampled)

        # Count complete vs incomplete
        complete = sum(1 for c in resampled if c.get("_complete", False))
        incomplete = len(resampled) - complete
        result["stats"]["complete_candles"] = complete
        result["stats"]["incomplete_candles"] = incomplete

        # Try to get native TF candles for comparison (best-effort)
        native_candles = []
        try:
            native_candles = get_candles(symbol, from_dt, to_dt, tf)
        except Exception as e:
            logger.debug(f"No native {tf} candles available for comparison: {e}")

        if native_candles:
            # Build lookup by timestamp
            native_by_ts = {}
            for c in native_candles:
                ts_raw = c.get("time") or c.get("ts") or c.get("t")
                if ts_raw:
                    # Normalize to ISO
                    if isinstance(ts_raw, (int, float)):
                        ts_key = datetime.fromtimestamp(ts_raw, tz=timezone.utc).isoformat()
                    else:
                        ts_key = str(ts_raw)
                    native_by_ts[ts_key] = c

            # Compare
            mismatches = []
            max_diff = 0.0
            first_mismatch = None

            for rc in resampled:
                ts = rc.get("time")
                if ts not in native_by_ts:
                    continue  # Can't compare

                nc = native_by_ts[ts]

                # Compare OHLC
                for field in ["open", "high", "low", "close"]:
                    r_val = float(rc.get(field, 0))
                    n_val = float(nc.get(field) or nc.get(field[0], 0))  # 'o' or 'open'

                    if n_val == 0:
                        continue

                    diff = abs(r_val - n_val) / n_val

                    if diff > tolerance:
                        mismatch = {
                            "ts": ts,
                            "field": field,
                            "resampled": r_val,
                            "native": n_val,
                            "diff_pct": round(diff * 100, 4),
                        }
                        mismatches.append(mismatch)

                        if diff > max_diff:
                            max_diff = diff

                        if first_mismatch is None:
                            first_mismatch = ts

            result["mismatches"] = mismatches[:20]  # Limit to first 20
            result["stats"]["mismatch_count"] = len(mismatches)
            result["stats"]["max_abs_diff"] = round(max_diff * 100, 4)
            result["stats"]["first_mismatch_ts"] = first_mismatch

            if mismatches:
                result["ok"] = False
                result["rootCause"] = "TF_MISMATCH"
                result["suggestion"] = f"Found {len(mismatches)} price mismatches. Max diff: {max_diff*100:.2f}%"
        else:
            # No native comparison available - just report stats
            result["suggestion"] = f"No native {tf} data for comparison. Resample stats: {complete} complete, {incomplete} incomplete candles."

        # Additional checks
        if incomplete > complete * 0.1:  # More than 10% incomplete
            result["ok"] = False
            result["rootCause"] = "PROVIDER_LAG"
            result["suggestion"] = f"High incomplete candle ratio ({incomplete}/{len(resampled)}). Provider may be lagging."

    except Exception as e:
        logger.exception("verify_resample failed")
        result["ok"] = False
        result["rootCause"] = "ERROR"
        result["suggestion"] = f"Verification error: {str(e)}"

    return result


def get_resample_status(symbol: str, tf: str) -> Dict[str, Any]:
    """
    Quick status check for resample health.

    Returns:
        Dict with status fields
    """
    result = verify_resample(symbol, tf, days=1, tolerance=DEFAULT_TOLERANCE)
    return {
        "ok": result["ok"],
        "rootCause": result["rootCause"],
        "grid": result["grid"],
        "windowCompletePolicy": result["windowCompletePolicy"],
        "stats": result["stats"],
        "suggestion": result["suggestion"],
    }
'''

VERIFY.write_text(verify_code, encoding="utf-8")
print(f"Created: {VERIFY}")

# ============================================================
# 3. Add /api/marketdata/verify endpoint to api_server.py
# ============================================================

api_txt = API.read_text(encoding="utf-8")

# Check if endpoint already exists
if "/api/marketdata/verify" in api_txt:
    print("NOTE: /api/marketdata/verify endpoint already exists - skipping")
else:
    # Find a good insertion point (after /api/marketdata/status)
    insert_marker = '@app.get("/api/marketdata/status")'
    if insert_marker not in api_txt:
        # Try alternate
        insert_marker = "@app.get('/api/marketdata/status')"

    if insert_marker in api_txt:
        # Find end of that function (next @app decorator or def at same indent)
        idx = api_txt.find(insert_marker)
        # Look for next route
        next_route_idx = api_txt.find("@app.", idx + len(insert_marker))
        if next_route_idx == -1:
            next_route_idx = len(api_txt)

        endpoint_code = '''

@app.get("/api/marketdata/verify")
def marketdata_verify(
    symbol: str = "BTCUSD",
    tf: str = "1h",
    days: int = 7,
    tolerance: float = 0.0001
):
    """
    Verify M5 -> TF resample accuracy and UTC bucket alignment.

    Args:
        symbol: Trading symbol (e.g., BTCUSD, EURUSD)
        tf: Target timeframe (1h, 4h, d1)
        days: Lookback days (default 7)
        tolerance: Price diff tolerance fraction (default 0.0001 = 0.01%)

    Returns:
        {
            ok: bool,
            grid: "UTC",
            windowCompletePolicy: "strict",
            mismatches: [...],
            stats: {total_candles, complete_candles, mismatch_count, max_abs_diff},
            suggestion: str
        }
    """
    try:
        from core.marketdata_verify import verify_resample
        return verify_resample(symbol, tf, days, tolerance)
    except ImportError as e:
        return {
            "ok": False,
            "error": f"marketdata_verify module not found: {e}",
            "suggestion": "Ensure core/marketdata_verify.py exists"
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "suggestion": "Check backend logs for details"
        }

'''
        api_txt = api_txt[:next_route_idx] + endpoint_code + api_txt[next_route_idx:]
        API.write_text(api_txt, encoding="utf-8")
        print(f"Added /api/marketdata/verify endpoint to: {API}")
    else:
        print("WARNING: Could not find insertion point for endpoint")

print()
print("=" * 60)
print("PATCH COMPLETE")
print("=" * 60)
print(f"timestamp_utc: {datetime.utcnow().isoformat()}Z")
print()
print("Files modified:")
print(f"  - {BRIDGE}")
print(f"  - {VERIFY} (new)")
print(f"  - {API}")
print()
print("Next: Rebuild container and test endpoints")
