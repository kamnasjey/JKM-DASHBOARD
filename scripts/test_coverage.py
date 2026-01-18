#!/usr/bin/env python3
"""Test coverage inside container"""
from datetime import datetime, timezone, timedelta
from core.market_data_service import get_market_data_store

store = get_market_data_store()
now = datetime.now(timezone.utc)
from_dt = now - timedelta(days=30)

for sym in ["BTCUSD", "EURUSD", "XAUUSD"]:
    info = store.check_coverage(sym, from_dt, now, "5m", min_coverage_pct=10.0)
    print(f"{sym}: has_data={info.has_data}, coverage_pct={info.coverage_pct:.1f}%, rows={info.rows_count}")
