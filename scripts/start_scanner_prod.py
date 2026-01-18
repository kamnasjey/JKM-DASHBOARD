#!/usr/bin/env python3
"""Start scanner with production config"""
import requests

r = requests.post('http://localhost:8000/scan/start', json={
    'strategyId': 'starter_EDGE_1',
    'timeframes': ['1h'],
    'lookbackDays': 30,
    'intervalSec': 120,
    'minRR': 1.2,
    'minConfirmHits': 0
})
import json
print(json.dumps(r.json(), indent=2))
