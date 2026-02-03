# JKM Production Master Runbook

> **Last Updated:** January 15, 2026  
> **Mode:** Path-2 (Firestore-only, Prisma optional)

---

## A) Vercel Setup (Dashboard)

### Required Environment Variables

```bash
# Auth
NEXTAUTH_URL=https://jkmcopilot.com
NEXTAUTH_SECRET=<random-32-char-string>

# Google OAuth
GOOGLE_CLIENT_ID=<from-gcp-console>
GOOGLE_CLIENT_SECRET=<from-gcp-console>

# Firebase Admin (choose ONE method)
# Method 1: Full JSON (escape quotes)
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Method 2: Base64 encoded
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-json>

# Backend Proxy (for simulator and other APIs)
BACKEND_ORIGIN=https://api.jkmcopilot.com
BACKEND_INTERNAL_API_KEY=<shared-secret-key>

# Internal API Key (REQUIRED - must match DO backend DASHBOARD_INTERNAL_API_KEY)
# Used for service-to-service calls from backend to dashboard
DASHBOARD_INTERNAL_API_KEY=<shared-secret-key>

# Billing (disabled for now)
BILLING_DISABLED=1
```

### Auth Modes for API Routes

| Route Pattern | Browser (Session) | Backend (Internal Key) |
|---------------|-------------------|------------------------|
| `/api/strategies/v2` | ✅ NextAuth cookie | ✅ x-internal-api-key + ?user_id= |
| `/api/internal/user-data/*` | ❌ | ✅ x-internal-api-key only |
| `/api/proxy/*` | ✅ NextAuth cookie | ❌ |

**For backend service calls:**
```bash
# GET strategies for user
curl -H "x-internal-api-key: YOUR_KEY" \
  "https://www.jkmcopilot.com/api/strategies/v2?user_id=USER_ID"

# POST new strategy for user
curl -X POST -H "x-internal-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","detectors":["EQ_BREAK"]}' \
  "https://www.jkmcopilot.com/api/strategies/v2?user_id=USER_ID"
```

### Optional Environment Variables

```bash
# Only add if enabling Prisma/Postgres later
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Deploy Commands

```bash
# From local JKM-DASHBOARD folder
git push origin main  # Triggers Vercel auto-deploy
```

---

## B) DigitalOcean Setup (Backend)

### Required Environment Variables

Create `/opt/JKM-AI-BOT/.env`:

```bash
# Internal API (must match dashboard)
INTERNAL_API_KEY=<shared-secret-key>

# Market Data Provider
MARKET_DATA_API_KEY=<your-api-key>

# Dashboard Gateway
DASHBOARD_BASE_URL=https://jkmcopilot.com
DASHBOARD_INTERNAL_API_KEY=<same-as-INTERNAL_API_KEY>

# Privacy Mode (required for production)
JKM_PRIVACY_MODE=1
```

### Deploy Commands

```bash
ssh root@159.65.11.255
cd /opt/JKM-AI-BOT
git pull origin main
docker compose down && docker compose up -d --build
docker logs -f jkm_bot_backend
```

---

## C) Verification Steps

### Dashboard Verification

```bash
# 1. Public health check
curl -s https://jkmcopilot.com/api/health | jq

# Expected: {"ok":true,"nextauth":"configured","firestore":"ok",...}

# 2. Internal API health (from VPS or with key)
curl -s -H "x-internal-api-key: YOUR_KEY" \
  "https://jkmcopilot.com/api/internal/user-data/health?skip_prisma=true" | jq

# Expected: {"ok":true,"checks":{"firestore":{"ok":true},...}}

# 3. Auth mode check
curl -s https://jkmcopilot.com/api/auth/mode | jq

# Expected: {"google":true,"email":false,"phone":false}

# 4. Manual test:
#    - Visit https://jkmcopilot.com/auth/login
#    - Click "Sign in with Google"
#    - After redirect, visit /api/access-check
#    - Should show: {"hasAccess":true/false,"source":"firestore"}
```

### Backend Verification

```bash
# 1. Health check (from VPS)
ssh root@159.65.11.255 "curl -s http://localhost:8000/health | python3 -m json.tool"

# Expected output:
# {
#   "ok": true,
#   "privacy_mode": true,
#   "provider_configured": true,
#   "dashboard_user_data": {
#     "configured": true,
#     "reachable": true,
#     "last_status": 200
#   }
# }

# 2. Dashboard gateway connectivity (from VPS)
ssh root@159.65.11.255 'source /opt/JKM-AI-BOT/.env && \
  curl -s -H "x-internal-api-key: $DASHBOARD_INTERNAL_API_KEY" \
  "$DASHBOARD_BASE_URL/api/internal/user-data/health?skip_prisma=true" | python3 -m json.tool'

# Expected: {"ok":true,"checks":{"firestore":{"ok":true}}}

# 3. Detectors endpoint
curl -s http://localhost:8000/api/detectors | python3 -m json.tool

# 4. Privacy mode active
docker logs jkm_bot_backend 2>&1 | grep -i privacy
# Expected: "[privacy] JKM_PRIVACY_MODE enabled..."
```

---

## D) Strategy API (v2)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies/v2` | List strategies (paginated) |
| POST | `/api/strategies/v2` | Create new strategy |
| GET | `/api/strategies/v2/[id]` | Get single strategy |
| PATCH | `/api/strategies/v2/[id]` | Update strategy |
| DELETE | `/api/strategies/v2/[id]` | Delete strategy |

### Data Model

```
Firestore: users/{uid}/strategies/{strategyId}
```

**Strategy Document Fields:**
- `name` (string, required) - Strategy name
- `enabled` (boolean) - Active status
- `detectors` (string[]) - List of detector IDs
- `symbols` (string[]) - Trading symbols
- `timeframe` (string) - Chart timeframe
- `config` (object) - Strategy-specific configuration
- `createdAt` (timestamp) - Auto-set on create
- `updatedAt` (timestamp) - Auto-updated on changes

### Verification Commands

```bash
# 1. List strategies (requires auth session)
curl -s -b "next-auth.session-token=<SESSION>" \
  "https://jkmcopilot.com/api/strategies/v2?limit=10" | jq

# Expected: {"ok":true,"strategies":[...],"count":N}

# 2. Create strategy (requires auth session)
curl -s -X POST -b "next-auth.session-token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Strategy","detectors":["EQ_BREAK"],"enabled":false}' \
  "https://jkmcopilot.com/api/strategies/v2" | jq

# Expected: {"ok":true,"strategy":{...},"created":true}

# 3. Update strategy 
curl -s -X PATCH -b "next-auth.session-token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}' \
  "https://jkmcopilot.com/api/strategies/v2/STRATEGY_ID" | jq

# Expected: {"ok":true,"strategy":{...}}

# 4. Delete strategy
curl -s -X DELETE -b "next-auth.session-token=<SESSION>" \
  "https://jkmcopilot.com/api/strategies/v2/STRATEGY_ID" | jq

# Expected: {"ok":true,"deleted":true}
```

### Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 401 | `UNAUTHENTICATED` | No valid session |
| 401 | `INVALID_SESSION` | Session missing user ID |
| 404 | `NOT_FOUND` | Strategy doesn't exist |
| 409 | `MAX_STRATEGIES_EXCEEDED` | User has 30+ strategies |
| 422 | `VALIDATION_ERROR` | Invalid input data |
| 500 | `INTERNAL_ERROR` | Server error |

---

## E) Strategy Simulator (MVP)

### Architecture

```
Browser → POST /api/simulator/run (Dashboard)
           ↓
Dashboard Server:
  1. getServerSession() → uid
  2. Load hasPaidAccess from Firestore
  3. Load strategy from Firestore subcollection
  4. Proxy to backend with BACKEND_INTERNAL_API_KEY
           ↓
Backend (VPS):
  - Fetch historical OHLCV
  - Auto-select timeframe based on date range
  - Run detectors (intraday + swing)
  - Evaluate TP/SL outcomes
  - Generate suggestions
           ↓
Response → Browser
```

### Verification Commands

```bash
# A) Check diagnostics endpoint (no auth needed)
curl -s "https://jkmcopilot.com/api/diagnostics/simulator" | jq

# Expected output (after running a simulation):
# {
#   "ok": true,
#   "lastRun": {
#     "response": {
#       "backendVersion": "2026-01-16-v4-explainability",
#       "detectorClassification": {
#         "requested": 7,
#         "normalized": 7,
#         "implemented": 7,
#         "notImplemented": 0,
#         "unknown": 0
#       },
#       "explainability": { ... }  // if 0 trades
#     }
#   }
# }

# B) Check backend simulator version directly (from VPS)
ssh root@159.65.11.255 'docker exec jkm_bot_backend python -c "from core.simulator_v2 import SIM_VERSION; print(SIM_VERSION)"'

# Expected: 2026-01-16-v4-explainability

# C) Check registered detectors count (from VPS)
ssh root@159.65.11.255 'docker exec jkm_bot_backend python -c "from core.detectors import DETECTOR_REGISTRY; print(len(DETECTOR_REGISTRY.list_all()))"'

# Expected: 32 (all detectors registered)

# D) Test simulator directly on VPS (internal API)
ssh root@159.65.11.255 'curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: lg8Nok080Yc2wXsnTYnLLItT4xpvQY9Lnd8-GhiHPp8" \
  -d '"'"'{"uid":"test","symbols":["EURUSD"],"from":"2026-01-10","to":"2026-01-15","timeframe":"multi","strategy":{"detectors":["BOS","FVG","GATE_REGIME"]}}'"'"' \
  http://127.0.0.1:8000/api/simulator/run | python3 -m json.tool | head -50'

# Expected: {"ok": true, "combined": {...}, "meta": {"simVersion": "2026-01-16-v4-explainability", ...}}
```

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulator/run` | Run strategy simulation |

### Request Format

```json
{
  "strategyId": "abc123",
  "symbols": ["XAUUSD", "EURUSD"],
  "from": "2026-01-01",
  "to": "2026-01-15",
  "timeframe": "auto",
  "mode": "winrate"
}
```

### Response Format (MVP)

```json
{
  "ok": true,
  "summary": {
    "entries": 50,
    "tp": 30,
    "sl": 15,
    "open": 5,
    "winrate": 66.7
  },
  "byHorizon": {
    "intraday": { "entries": 40, "tp": 25, "sl": 10, "open": 5, "winrate": 71.4 },
    "swing": { "entries": 10, "tp": 5, "sl": 5, "open": 0, "winrate": 50.0 }
  },
  "suggestions": [
    { "title": "Add trend filter", "why": "...", "how": "..." }
  ],
  "meta": {
    "baseTimeframe": "15m",
    "range": { "from": "...", "to": "..." },
    "demoMode": false
  }
}
```

### Auto Timeframe Selection

| Date Range | Base TF | Higher TF |
|------------|---------|-----------|
| ≤ 7 days | 5m | 1h |
| ≤ 45 days | 15m | 4h |
| ≤ 180 days | 1h | 4h |
| > 180 days | 4h | 1d |

### Demo Mode (No Paid Access)

- Limited to 1 symbol
- Limited to 7 day date range
- Response includes `demoMode: true` and `demoMessage`

### Verification Commands

```bash
# 1. Via dashboard (requires session cookie)
curl -s -X POST -b "next-auth.session-token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"strategyId":"STRATEGY_ID","symbols":["XAUUSD"],"from":"2026-01-08","to":"2026-01-15"}' \
  "https://jkmcopilot.com/api/simulator/run" | jq

# 2. Direct backend test (from VPS)
ssh root@159.65.11.255 'source /opt/JKM-AI-BOT/.env && \
  curl -s -X POST -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"uid\":\"test\",\"symbols\":[\"XAUUSD\"],\"from\":\"2026-01-08\",\"to\":\"2026-01-15\",\"timeframe\":\"auto\",\"strategy\":{\"detectors\":[\"BOS\"]}}" \
  http://localhost:8000/api/simulator/run | python3 -m json.tool'
```

### Simulator Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 401 | `UNAUTHENTICATED` | No valid session |
| 404 | `STRATEGY_NOT_FOUND` | Strategy doesn't exist |
| 422 | `VALIDATION_ERROR` | Invalid request data |
| 422 | `BARS_LIMIT_EXCEEDED` | Date range too large (>200k bars) |
| 502 | `BACKEND_KEY_MISMATCH` | `BACKEND_INTERNAL_API_KEY` doesn't match |
| 502 | `BACKEND_UNAVAILABLE` | Backend not reachable |

---

## F) Troubleshooting Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| **401 from internal API** | `INTERNAL_API_KEY` mismatch | Ensure Dashboard `INTERNAL_API_KEY` == Backend `DASHBOARD_INTERNAL_API_KEY` |
| **Firebase init failed** | Missing or malformed JSON | Check `FIREBASE_SERVICE_ACCOUNT` is valid base64 or `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` is valid JSON |
| **"Firebase: invalid JSON"** | Escaped quotes wrong | Use base64 method instead: `cat key.json \| base64 -w0` |
| **NextAuth redirect loop** | `NEXTAUTH_URL` wrong | Must match exact domain (https://jkmcopilot.com, no trailing slash) |
| **CORS blocked** | Origin not allowed | Backend allows: jkmcopilot.com, www.jkmcopilot.com, *.vercel.app |
| **502 Bad Gateway** | Backend not running | `docker compose ps` → restart if down |
| **502 from nginx** | Port binding issue | Check `docker-compose.yml` has `127.0.0.1:8000:8000` |
| **health ok=false, provider** | Market data key missing | Add `MARKET_DATA_API_KEY` to `/opt/JKM-AI-BOT/.env` |
| **health ok=false, dashboard** | Gateway unreachable | Check `DASHBOARD_BASE_URL` and key match |
| **Google OAuth error** | Callback URL mismatch | GCP Console → Authorized redirect URIs must include `https://jkmcopilot.com/api/auth/callback/google` |
| **Email/Phone disabled** | No DATABASE_URL | Expected in Path-2 mode. Add Postgres to enable. |

---

## Quick Reference

### Key URLs

| Service | URL |
|---------|-----|
| Dashboard | https://jkmcopilot.com |
| Backend API | http://159.65.11.255:8000 (via nginx) |
| Dashboard Health | /api/health |
| Backend Health | /health |
| Internal Gateway | /api/internal/user-data/* |

### Key Files

| Location | File |
|----------|------|
| Dashboard | `lib/db.ts`, `lib/auth-options.ts`, `lib/firebase-admin.ts` |
| Backend | `/opt/JKM-AI-BOT/.env`, `services/dashboard_user_data_client.py`, `core/privacy.py` |

### Emergency Commands

```bash
# Dashboard: Force redeploy
# Go to Vercel dashboard → Deployments → Redeploy

# Backend: Full restart
ssh root@159.65.11.255 "cd /opt/JKM-AI-BOT && docker compose down && docker compose up -d --build"

# Backend: Check logs
ssh root@159.65.11.255 "docker logs -f --tail=200 jkm_bot_backend"

# Backend: Exec into container
ssh root@159.65.11.255 "docker exec -it jkm_bot_backend sh"
```

---

## G) Continuous Scanner

### Architecture

```
Dashboard /scanner → POST /api/scanner/start (Dashboard)
                           ↓
Dashboard Server:
  1. getServerSession() → uid
  2. Normalize detector IDs (DETECTOR_ALIASES)
  3. Proxy to backend /scan/start
                           ↓
Backend (VPS):
  - Lock file prevents multiple instances
  - Persistent state (JSON files in /app/state/)
  - Per-symbol error isolation with backoff
  - Results appended to JSONL file
                           ↓
Dashboard polls /api/scanner/status + /api/scanner/results
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scanner/start` | Start continuous scan |
| POST | `/api/scanner/stop` | Stop current scan |
| GET | `/api/scanner/status` | Get scan status + counters |
| GET | `/api/scanner/results` | Get found setups |

### Backend State Files (VPS)

| File | Purpose |
|------|---------|
| `/app/state/scan_config.json` | Active scan configuration |
| `/app/state/scan_status.json` | Running status + counters |
| `/app/state/scan_results.jsonl` | Found setups (append-only) |
| `/app/state/scan.lock` | PID lock to prevent duplicates |

### Start Scanner Request

```json
{
  "strategyId": "abc123",
  "strategyName": "My Strategy",
  "detectors": ["BREAK_RETEST", "BOS", "FVG"],
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "timeframes": ["15m", "1h", "4h"],
  "lookbackDays": 30,
  "intervalSec": 120
}
```

### Scanner Status Response

```json
{
  "running": true,
  "runId": "20260116_143022",
  "startedAt": "2026-01-16T14:30:22Z",
  "lastCycleAt": "2026-01-16T14:32:22Z",
  "nextCycleAt": "2026-01-16T14:34:22Z",
  "config": {
    "strategyId": "abc123",
    "symbols": ["BTCUSDT", "ETHUSDT"],
    "timeframes": ["15m", "1h", "4h"]
  },
  "counters": {
    "cycles": 15,
    "setupsFound": 3,
    "errors": 1
  },
  "simVersion": "2026-01-16-v4-explainability"
}
```

### Verification Commands

```bash
# 1. Check scanner status (from VPS)
ssh root@159.65.11.255 'curl -s http://localhost:8000/scan/status | python3 -m json.tool'

# 2. Check scanner lock file
ssh root@159.65.11.255 'cat /app/state/scan.lock 2>/dev/null || echo "No scan running"'

# 3. View recent results
ssh root@159.65.11.255 'tail -5 /app/state/scan_results.jsonl 2>/dev/null | python3 -m json.tool || echo "No results"'

# 4. Force stop scanner
ssh root@159.65.11.255 'curl -s -X POST http://localhost:8000/scan/stop | python3 -m json.tool'
```

### Error Handling

- **Per-symbol isolation**: Errors on BTCUSDT don't stop ETHUSDT scanning
- **Backoff**: Failed symbols retry with increasing delay (30s → 60s → 120s)
- **Crash recovery**: On restart, scanner checks state files and can resume
- **Lock safety**: PID lock prevents duplicate scanner processes

---

## H) Smoke Tests

Quick verification commands to run after deployment:

### Dashboard Smoke Tests (Local/CI)

```powershell
# 1. Dashboard health
curl.exe -s https://www.jkmcopilot.com/api/health | ConvertFrom-Json

# 2. Auth mode check
curl.exe -s https://www.jkmcopilot.com/api/auth/mode | ConvertFrom-Json

# 3. Detector catalog (31 detectors with EN/MN labels)
$resp = curl.exe -s https://www.jkmcopilot.com/api/detectors
$json = $resp | ConvertFrom-Json
Write-Host "Detectors count: $($json.detectors.Length)"
# Expected: 31

# 4. Strategies v2 (requires auth or internal key)
curl.exe -s -H "x-internal-api-key: YOUR_KEY" "https://www.jkmcopilot.com/api/strategies/v2?user_id=TEST_UID"

# 5. Scanner status (via dashboard proxy)
curl.exe -s https://www.jkmcopilot.com/api/scanner/status
```

### Backend Smoke Tests (VPS SSH)

```bash
# Run all from VPS
ssh root@159.65.11.255 'bash -s' << 'EOF'

echo "=== 1. Backend health ==="
curl -s http://localhost:8000/health | python3 -m json.tool

echo -e "\n=== 2. Detector health ==="
curl -s http://localhost:8000/health/detectors | python3 -m json.tool

echo -e "\n=== 3. Registered detectors count ==="
docker exec jkm_bot_backend python -c "from core.detectors import DETECTOR_REGISTRY; print('Detectors:', len(DETECTOR_REGISTRY.list_all()))"

echo -e "\n=== 4. Simulator version ==="
docker exec jkm_bot_backend python -c "from core.simulator_v2 import SIM_VERSION; print('SIM_VERSION:', SIM_VERSION)"

echo -e "\n=== 5. Scanner status ==="
curl -s http://localhost:8000/scan/status | python3 -m json.tool

echo -e "\n=== 6. Quick simulator test ==="
source /opt/JKM-AI-BOT/.env
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -d '{"uid":"smoke-test","symbols":["BTCUSDT"],"from":"2026-01-10","to":"2026-01-12","timeframe":"15m","strategy":{"detectors":["BOS","FVG"]}}' \
  http://localhost:8000/api/simulator/run | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok'), 'version:', d.get('meta',{}).get('simVersion'))"

echo -e "\n=== SMOKE TESTS COMPLETE ==="
EOF
```

### Expected Results Summary

| Test | Expected |
|------|----------|
| Dashboard health | `{"ok":true}` |
| Auth mode | `{"google":true}` |
| Detector catalog | 31 detectors with EN/MN labels |
| Backend health | `{"ok":true,"privacy_mode":true}` |
| Detector health | `{"ok":true,"total":32}` |
| Simulator quick | `{"ok":true,"meta":{"simVersion":"...v4-explainability"}}` |
| Scanner status | `{"running":true/false}` |

---

## I) Deploy Instructions (with SIM_VERSION)

### Full Backend Deploy

```bash
# 1. SSH to VPS
ssh root@159.65.11.255

# 2. Navigate to project
cd /opt/JKM-AI-BOT

# 3. Pull latest code
git pull origin main

# 4. Set SIM_VERSION if updating (optional - can also set in core/simulator_v2.py)
export SIM_VERSION="2026-01-16-v5-scanner"

# 5. Rebuild and restart with version injection
docker compose down
docker compose build --build-arg SIM_VERSION="$SIM_VERSION"
docker compose up -d

# 6. Verify
docker logs -f --tail=100 jkm_bot_backend
# Look for: "SIM_VERSION: 2026-01-16-v5-scanner"
```

### Docker Compose Build Args

Add to `docker-compose.yml` for version injection:

```yaml
services:
  backend:
    build:
      context: .
      args:
        - SIM_VERSION=${SIM_VERSION:-auto}
    # ... rest of config
```

Add to `Dockerfile`:

```dockerfile
ARG SIM_VERSION=auto
ENV SIM_VERSION=$SIM_VERSION
```

### Quick Restart (No Version Change)

```bash
ssh root@159.65.11.255 "cd /opt/JKM-AI-BOT && docker compose restart backend && docker logs -f --tail=50 jkm_bot_backend"
```

### Dashboard Deploy (Vercel)

Dashboard deploys automatically on `git push origin main`.

For manual redeploy:
1. Go to Vercel Dashboard → JKM project
2. Deployments → Click "..." → "Redeploy"

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Dashboard)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  NextAuth   │  │  Next.js    │  │  Internal API       │  │
│  │  (Google)   │  │  Frontend   │  │  /api/internal/*    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Firebase Admin SDK                       │   │
│  │              (Firestore - User Data)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ x-internal-api-key
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              DIGITALOCEAN VPS (Backend)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Nginx     │  │  FastAPI    │  │  Dashboard Client   │  │
│  │   :80/443   │──│  :8000      │──│  (Privacy Mode)     │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Market Data (Third-party Source)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
