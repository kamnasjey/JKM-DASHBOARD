#!/usr/bin/env python3
"""Patch get_candles - handle whitespace correctly"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/market_data_bridge.py")
s = p.read_text("utf-8")

# Pattern with extra whitespace
old = """    tf = _normalize_timeframe(timeframe)
    
    if _is_v2_enabled():
        return _get_candles_v2(symbol, from_dt, to_dt, tf)
    else:
        return _get_candles_v1(symbol, from_dt, to_dt, tf)


def _get_candles_v2("""

new = """    tf = _normalize_timeframe(timeframe)
    
    # For M5, fetch directly
    if tf in ("m5", "5m"):
        if _is_v2_enabled():
            return _get_candles_v2(symbol, from_dt, to_dt, tf)
        else:
            return _get_candles_v1(symbol, from_dt, to_dt, tf)
    
    # For higher TFs (H1, H4, D1), derive from M5 via aggregation
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
    return aggregated


def _get_candles_v2("""

if old in s:
    s = s.replace(old, new)
    p.write_text(s, "utf-8")
    print("PATCHED: get_candles now uses TF aggregation")
else:
    print("Pattern not found, trying regex...")
    import re
    # Use regex to match with flexible whitespace
    pattern = r'(    tf = _normalize_timeframe\(timeframe\)\s+if _is_v2_enabled\(\):\s+return _get_candles_v2\(symbol, from_dt, to_dt, tf\)\s+else:\s+return _get_candles_v1\(symbol, from_dt, to_dt, tf\)\s+def _get_candles_v2\()'
    
    match = re.search(pattern, s)
    if match:
        print(f"Found with regex at {match.start()}")
        replacement = """    tf = _normalize_timeframe(timeframe)
    
    # For M5, fetch directly
    if tf in ("m5", "5m"):
        if _is_v2_enabled():
            return _get_candles_v2(symbol, from_dt, to_dt, tf)
        else:
            return _get_candles_v1(symbol, from_dt, to_dt, tf)
    
    # For higher TFs, derive from M5 via aggregation
    logger.debug(f"Fetching M5 to aggregate to {tf} for {symbol}")
    
    if _is_v2_enabled():
        m5_candles = _get_candles_v2(symbol, from_dt, to_dt, "m5")
    else:
        m5_candles = _get_candles_v1(symbol, from_dt, to_dt, "m5")
    
    if not m5_candles:
        logger.warning(f"No M5 candles for {symbol}")
        return []
    
    aggregated = aggregate_ohlc(m5_candles, "m5", tf)
    logger.info(f"Aggregated {len(m5_candles)} M5 -> {len(aggregated)} {tf} candles for {symbol}")
    return aggregated


def _get_candles_v2("""
        s = re.sub(pattern, replacement, s)
        p.write_text(s, "utf-8")
        print("PATCHED via regex")
    else:
        print("Regex also failed")
