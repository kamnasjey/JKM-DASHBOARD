#!/usr/bin/env python3
"""List simulator-related endpoints from the API"""
import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8000/openapi.json") as resp:
        data = json.load(resp)
    
    print("=== SIMULATOR-RELATED ENDPOINTS ===")
    for path in sorted(data.get("paths", {}).keys()):
        if "sim" in path.lower() or "strat" in path.lower():
            methods = list(data["paths"][path].keys())
            print(f"  {path} [{', '.join(m.upper() for m in methods)}]")
    
    print("\n=== ALL API ENDPOINTS ===")
    for path in sorted(data.get("paths", {}).keys()):
        methods = list(data["paths"][path].keys())
        print(f"  {path} [{', '.join(m.upper() for m in methods)}]")

except Exception as e:
    print(f"ERROR: {e}")
