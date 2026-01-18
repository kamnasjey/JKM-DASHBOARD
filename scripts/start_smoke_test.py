#!/usr/bin/env python3
"""Start scanner smoke test with BTCUSD only"""
import requests
import json

payload = {
    "strategyId": "starter_EDGE_1",
    "symbols": ["BTCUSD"],
    "timeframes": ["1h"],
    "lookbackDays": 30,
    "intervalSec": 120,
    "minRR": 1.2,
    "minConfirmHits": 0
}

r = requests.post("http://localhost:8000/scan/start", json=payload)
print(json.dumps(r.json(), indent=2))
