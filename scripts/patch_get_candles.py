#!/usr/bin/env python3
"""
Patch get_candles to use TF aggregation
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/market_data_bridge.py")
s = p.read_text("utf-8")

# Find and replace the get_candles function body
# Look for the return statement pattern
old_pattern = '''    # Normalize timeframe
    tf = _normalize_timeframe(timeframe)

    if _is_v2_enabled():
        return _get_candles_v2(symbol, from_dt, to_dt, tf)
    else:
        return _get_candles_v1(symbol, from_dt, to_dt, tf)'''

new_pattern = '''    # Normalize timeframe
    tf = _normalize_timeframe(timeframe)
    
    # For M5, fetch directly
    if tf in ("m5", "5m"):
        if _is_v2_enabled():
            return _get_candles_v2(symbol, from_dt, to_dt, tf)
        else:
            return _get_candles_v1(symbol, from_dt, to_dt, tf)
    
    # For higher TFs (H1, H4, D1), derive from M5 via aggregation
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

if old_pattern in s:
    s = s.replace(old_pattern, new_pattern)
    p.write_text(s, "utf-8")
    print("PATCHED: get_candles now aggregates M5 to higher TFs")
else:
    print("Pattern not found - checking alternative...")
    # Try alternative pattern
    alt_old = '''    tf = _normalize_timeframe(timeframe)

    if _is_v2_enabled():
        return _get_candles_v2(symbol, from_dt, to_dt, tf)
    else:
        return _get_candles_v1(symbol, from_dt, to_dt, tf)'''
    
    if alt_old in s:
        alt_new = '''    tf = _normalize_timeframe(timeframe)
    
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
    return aggregated'''
        s = s.replace(alt_old, alt_new)
        p.write_text(s, "utf-8")
        print("PATCHED (alt): get_candles now aggregates M5 to higher TFs")
    else:
        print("ERROR: No pattern found")
