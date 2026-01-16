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

# Market Data Provider (at least one)
MASSIVE_API_KEY=<massive-api-key>
# POLYGON_API_KEY=<polygon-api-key>  # Alternative

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
| **health ok=false, provider** | Massive key missing | Add `MASSIVE_API_KEY` to `/opt/JKM-AI-BOT/.env` |
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
│  │         Market Data (Massive/Polygon)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
