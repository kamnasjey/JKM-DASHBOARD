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

# Internal API (must match backend)
INTERNAL_API_KEY=<shared-secret-key>

# Billing (disabled for now)
BILLING_DISABLED=1
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

## D) Troubleshooting Matrix

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
