#!/usr/bin/env python3
"""Simple patch for MARKET_CLOSED hint"""
import re

FILE = '/opt/JKM-AI-BOT/core/scan_engine_v2.py'

with open(FILE, 'r') as f:
    content = f.read()

# Replace the entire hints dict to add TF info
old_hints = '''"MARKETDATA_NO_CANDLES": "No market data available - check data provider",
        "MARKETDATA_LOW_COVERAGE": "Insufficient data coverage (<50%)",
        "MARKET_CLOSED": "Market is closed (weekend) or data is stale (>2h old)",'''

new_hints = '''"MARKETDATA_NO_CANDLES": "No market data available (TF derived from M5)",
        "MARKETDATA_LOW_COVERAGE": "Insufficient data coverage <50% (TF from M5)",
        "MARKET_CLOSED": "Forex weekend closed - only BTCUSD active (H1 from M5)",'''

if old_hints in content:
    content = content.replace(old_hints, new_hints)
    with open(FILE, 'w') as f:
        f.write(content)
    print('PATCHED: Updated diagnostic hints with TF info')
elif 'H1 from M5' in content:
    print('ALREADY PATCHED')
else:
    print('Pattern not found - checking current content')
