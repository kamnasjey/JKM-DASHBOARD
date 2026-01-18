#!/usr/bin/env python3
"""
Patch scan_engine_v2.py to use market_data_bridge instead of direct MarketDataStore
This enables TF aggregation (M5 -> H1/H4)
"""
from pathlib import Path

p = Path("/opt/JKM-AI-BOT/core/scan_engine_v2.py")
s = p.read_text("utf-8")

# Replace the bridge_get_candles function to use market_data_bridge
old_bridge = '''def bridge_get_candles(symbol: str, from_dt: datetime, to_dt: datetime, tf: str = "5m") -> List[Dict[str, Any]]:
    """Get candles through bridge only - no direct provider calls."""
    store = _get_market_store()
    if store is None:
        logger.warning(f"MarketDataStore not available, returning empty for {symbol}")
        return []
    try:
        return store.get_candles(symbol, from_dt, to_dt, tf)
    except Exception as e:
        logger.error(f"bridge_get_candles error: {e}")
        return []'''

new_bridge = '''def bridge_get_candles(symbol: str, from_dt: datetime, to_dt: datetime, tf: str = "5m") -> List[Dict[str, Any]]:
    """Get candles through market_data_bridge - supports TF aggregation (M5->H1/H4)."""
    try:
        from core.market_data_bridge import get_candles as bridge_get
        candles = bridge_get(symbol, from_dt, to_dt, tf)
        logger.debug(f"bridge_get_candles: {symbol}/{tf} returned {len(candles)} candles")
        return candles
    except Exception as e:
        logger.error(f"bridge_get_candles error: {e}")
        # Fallback to direct store if bridge fails
        store = _get_market_store()
        if store is None:
            return []
        try:
            return store.get_candles(symbol, from_dt, to_dt, tf)
        except:
            return []'''

if old_bridge in s:
    s = s.replace(old_bridge, new_bridge)
    p.write_text(s, "utf-8")
    print("PATCHED: scan_engine_v2 now uses market_data_bridge for TF aggregation")
else:
    print("ERROR: Pattern not found")
