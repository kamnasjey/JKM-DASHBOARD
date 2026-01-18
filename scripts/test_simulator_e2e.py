#!/usr/bin/env python3
"""Test simulator with AUDJPY on weekend (expects MARKET_CLOSED) and BTCUSD (should work)"""
import urllib.request
import json

def test_sim(symbol, label):
    """Run simulator test for a symbol"""
    url = "http://localhost:8000/api/strategy-sim/run"
    payload = {
        "symbols": [symbol],
        "from": "2026-01-11",
        "to": "2026-01-18",
        "strategy": {
            "detectors": ["bos", "fvg", "ob"]
        }
    }
    
    print(f"\n=== {label} TEST ({symbol}) ===")
    
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
            print(f"explain.rootCause: {data.get('explain', {}).get('rootCause', 'N/A')}")
            print(f"explain.dataCoverage: {data.get('explain', {}).get('dataCoverage', 'N/A')}")
        
        # Pretty print full response
        print("\nFull response:")
        print(json.dumps(data, indent=2, default=str)[:2000])
        
    except urllib.error.HTTPError as e:
        print(f"Status: {e.code}")
        body = e.read().decode('utf-8', errors='replace')
        print(f"Response: {body[:1000]}")
    except Exception as e:
        print(f"ERROR: {e}")

# Test AUDJPY (Forex - should show MARKET_CLOSED on weekend)
test_sim("AUDJPY", "AUDJPY WEEKEND")

# Test BTCUSD (Crypto - always open)
test_sim("BTCUSD", "BTCUSD")
