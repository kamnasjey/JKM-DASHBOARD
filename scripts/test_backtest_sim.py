#!/usr/bin/env python3
"""Test backtest/simulate endpoint (no auth)"""
import urllib.request
import json

def test_backtest_simulate(symbol, label):
    """Run backtest simulate test"""
    url = "http://localhost:8000/api/backtest/simulate"
    payload = {
        "symbol": symbol,
        "from": "2026-01-11",
        "to": "2026-01-18",
        "detectors": ["bos", "fvg", "ob"],
        "timeframe": "1h"
    }
    
    print(f"\n=== {label} ({symbol}) ===")
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
        
        print(f"Status: 200 OK")
        print(f"tradeCount: {data.get('tradeCount', 'N/A')}")
        print(f"rootCause: {data.get('rootCause', 'N/A')}")
        print(f"simVersion: {data.get('simVersion', 'N/A')}")
        if data.get('explain'):
            print(f"explain: {json.dumps(data.get('explain'), indent=2)[:500]}")
        
        print(f"\nFull (truncated): {json.dumps(data, indent=2, default=str)[:1500]}")
        
    except urllib.error.HTTPError as e:
        print(f"Status: {e.code}")
        body = e.read().decode('utf-8', errors='replace')
        print(f"Response: {body[:1000]}")
    except Exception as e:
        print(f"ERROR: {e}")

# Test BTCUSD first (should work)
test_backtest_simulate("BTCUSD", "BTCUSD BACKTEST")

# Test AUDJPY (Forex weekend)
test_backtest_simulate("AUDJPY", "AUDJPY WEEKEND BACKTEST")
