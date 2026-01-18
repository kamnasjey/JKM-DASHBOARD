#!/usr/bin/env python3
"""Start scanner with 1H timeframe to test TF aggregation"""
import requests
import json

payload = {
    "strategyId": "starter_EDGE_1",
    "timeframes": ["1h"],
    "lookbackDays": 30,
    "intervalSec": 120,
    "minRR": 1.2,
    "minConfirmHits": 0
}

r = requests.post("http://localhost:8000/scan/start", json=payload)
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))
