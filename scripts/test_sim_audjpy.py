#!/usr/bin/env python3
"""Test simulator with AUDJPY (should show MARKET_CLOSED on weekend)"""
import requests
import json

# AUDJPY weekend test
r = requests.post('http://localhost:8000/api/strategy-sim/run', json={
    'uid': 'test_user',
    'requestId': 'test_audjpy_weekend',
    'symbols': ['AUDJPY'],
    'from': '2026-01-11',
    'to': '2026-01-18',
    'timeframe': '1h',
    'mode': 'winrate',
    'strategy': {
        'id': 'test_strategy',
        'name': 'AUDJPY Weekend Test',
        'detectors': ['bos', 'fvg', 'ob'],
        'symbols': ['AUDJPY'],
        'timeframe': '1h',
        'config': {}
    }
}, headers={'x-internal-api-key': 'test'})

print("=== AUDJPY WEEKEND TEST ===")
print(f"Status: {r.status_code}")
data = r.json()
print(json.dumps(data, indent=2, default=str)[:2000])
