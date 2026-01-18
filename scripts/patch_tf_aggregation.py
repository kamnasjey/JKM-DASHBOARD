#!/usr/bin/env python3
"""
Patch market_data_bridge.py to add TF aggregation (M5 -> 1H/4H/etc)
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/market_data_bridge.py")
s = p.read_text("utf-8")

patched = False

# 1) Add tf_to_seconds and aggregate_ohlc helpers after imports
aggregation_helpers = '''
# ============================================================
# TF Aggregation Helpers (M5 -> 1H/4H/D1)
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
    raise ValueError(f"Unsupported timeframe: {tf}")


def _candle_ts_to_int(x) -> int:
    """Convert candle timestamp (iso str or int) to epoch seconds."""
    if isinstance(x, (int, float)):
        return int(x)
    if isinstance(x, datetime):
        return int(x.timestamp())
    # iso string
    dt = datetime.fromisoformat(str(x).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def _ts_to_iso(ts: int) -> str:
    """Convert epoch seconds to ISO string."""
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def aggregate_ohlc(
    candles: List[Dict[str, Any]],
    from_tf: str,
    to_tf: str
) -> List[Dict[str, Any]]:
    """
    Aggregate candles from smaller to larger timeframe.
    
    E.g., M5 candles -> H1 candles (12 M5 = 1 H1)
    
    Returns list of aggregated candles with: time, open, high, low, close, volume
    """
    if not candles:
        return []
    
    from_sec = tf_to_seconds(from_tf)
    to_sec = tf_to_seconds(to_tf)
    
    if to_sec <= from_sec:
        return candles  # No aggregation needed
    
    out = []
    bucket = None
    
    def bucket_start(ts: int) -> int:
        return (ts // to_sec) * to_sec
    
    for c in candles:
        # Get timestamp
        ts_raw = c.get("time") or c.get("ts") or c.get("t") or c.get("timestamp")
        ts = _candle_ts_to_int(ts_raw)
        bs = bucket_start(ts)
        
        # Get OHLCV
        o = float(c.get("open") or c.get("o") or 0)
        h = float(c.get("high") or c.get("h") or 0)
        l = float(c.get("low") or c.get("l") or 0)
        cl = float(c.get("close") or c.get("c") or 0)
        v = float(c.get("volume") or c.get("v") or 0)
        
        if bucket is None or bucket["bucket_ts"] != bs:
            # Flush previous bucket
            if bucket is not None:
                out.append({
                    "time": _ts_to_iso(bucket["bucket_ts"]),
                    "open": bucket["open"],
                    "high": bucket["high"],
                    "low": bucket["low"],
                    "close": bucket["close"],
                    "volume": bucket["volume"],
                })
            # Start new bucket
            bucket = {
                "bucket_ts": bs,
                "open": o,
                "high": h,
                "low": l,
                "close": cl,
                "volume": v,
            }
        else:
            # Accumulate into current bucket
            bucket["high"] = max(bucket["high"], h)
            bucket["low"] = min(bucket["low"], l)
            bucket["close"] = cl
            bucket["volume"] += v
    
    # Flush last bucket
    if bucket is not None:
        out.append({
            "time": _ts_to_iso(bucket["bucket_ts"]),
            "open": bucket["open"],
            "high": bucket["high"],
            "low": bucket["low"],
            "close": bucket["close"],
            "volume": bucket["volume"],
        })
    
    logger.debug(f"Aggregated {len(candles)} {from_tf} candles -> {len(out)} {to_tf} candles")
    return out

'''

# Insert after the logger line
anchor = 'logger = logging.getLogger(__name__)'
if anchor in s and "aggregate_ohlc" not in s:
    s = s.replace(anchor, anchor + "\n" + aggregation_helpers)
    patched = True
    print("PATCHED: Added tf_to_seconds and aggregate_ohlc helpers")
elif "aggregate_ohlc" in s:
    print("SKIP: aggregate_ohlc already exists")
else:
    print("ERROR: Could not find anchor for helpers")


# 2) Modify get_candles to use aggregation for higher timeframes
old_get_candles = '''def get_candles(
    symbol: str,
    from_dt: datetime,
    to_dt: datetime,
    timeframe: str = "m5",
) -> List[Dict[str, Any]]:
    """
    Get candles using the appropriate data source.

    Returns list of dicts with: time, open, high, low, close, volume
    """
    # Ensure UTC
    if from_dt.tzinfo is None:
        from_dt = from_dt.replace(tzinfo=timezone.utc)
    if to_dt.tzinfo is None:
        to_dt = to_dt.replace(tzinfo=timezone.utc)

    # Normalize timeframe
    tf = _normalize_timeframe(timeframe)

    if _is_v2_enabled():
        return _get_candles_v2(symbol, from_dt, to_dt, tf)
    else:
        return _get_candles_v1(symbol, from_dt, to_dt, tf)'''

new_get_candles = '''def get_candles(
    symbol: str,
    from_dt: datetime,
    to_dt: datetime,
    timeframe: str = "m5",
) -> List[Dict[str, Any]]:
    """
    Get candles using the appropriate data source.
    
    For timeframes > M5, fetches M5 data and aggregates to target TF.
    This ensures we always have data even if higher TF data doesn't exist natively.

    Returns list of dicts with: time, open, high, low, close, volume
    """
    # Ensure UTC
    if from_dt.tzinfo is None:
        from_dt = from_dt.replace(tzinfo=timezone.utc)
    if to_dt.tzinfo is None:
        to_dt = to_dt.replace(tzinfo=timezone.utc)

    # Normalize timeframe
    tf = _normalize_timeframe(timeframe)
    
    # For M5, fetch directly
    if tf in ("m5", "5m"):
        if _is_v2_enabled():
            return _get_candles_v2(symbol, from_dt, to_dt, tf)
        else:
            return _get_candles_v1(symbol, from_dt, to_dt, tf)
    
    # For higher TFs (H1, H4, D1), always derive from M5 via aggregation
    # This ensures we have data even if native higher TF data doesn't exist
    logger.debug(f"Fetching M5 candles to aggregate to {tf} for {symbol}")
    
    if _is_v2_enabled():
        m5_candles = _get_candles_v2(symbol, from_dt, to_dt, "m5")
    else:
        m5_candles = _get_candles_v1(symbol, from_dt, to_dt, "m5")
    
    if not m5_candles:
        logger.warning(f"No M5 candles for {symbol}, cannot aggregate to {tf}")
        return []
    
    # Aggregate M5 -> target TF
    aggregated = aggregate_ohlc(m5_candles, "m5", tf)
    logger.info(f"Aggregated {len(m5_candles)} M5 -> {len(aggregated)} {tf} candles for {symbol}")
    return aggregated'''

if old_get_candles in s:
    s = s.replace(old_get_candles, new_get_candles)
    patched = True
    print("PATCHED: get_candles now aggregates M5 to higher TFs")
else:
    print("SKIP: get_candles pattern not found (may differ)")


# Save
if patched:
    p.write_text(s, "utf-8")
    print("DONE - File saved")
else:
    print("NO CHANGES")
