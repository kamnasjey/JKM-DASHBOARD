# JKM Trading AI Bot - Production Runbook

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Users/Web     │────▶│   Dashboard     │────▶│   Firestore     │
│                 │     │  (Vercel)       │     │  (Canonical DB) │
└─────────────────┘     └────────┬────────┘     └────────▲────────┘
                                 │                       │
                                 │ /api/proxy/*          │ /api/internal/*
                                 ▼                       │
                        ┌─────────────────┐              │
                        │    Backend      │──────────────┘
                        │ (DigitalOcean)  │
                        │  FastAPI+Docker │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Massive.com    │
                        │  (Data Provider)│
                        └─────────────────┘
```

**Key Principles:**
- Firestore = Canonical user data store (identity, prefs, strategies, signals)
- Backend does NOT have Firebase credentials
- Backend accesses user data via Dashboard internal API only
- JKM_PRIVACY_MODE=1 on backend (no local user data persistence)

---

## Part 1: Dashboard (Vercel) Setup

### 1.1 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | ✅ | Production URL: `https://jkmcopilot.com` |
| `NEXTAUTH_SECRET` | ✅ | Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | ✅ | Full service account JSON (one-liner) |
| `USER_DATA_PROVIDER` | ✅ | Set to `firebase` |
| `DASHBOARD_INTERNAL_API_KEY` | ✅ | Generate: `openssl rand -base64 32` |
| `BACKEND_INTERNAL_API_KEY` | ✅ | Must match backend's `INTERNAL_API_KEY` |

**Optional (for full features):**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ⚠️ | Postgres URL for auth/billing. Without it, only Google OAuth works. |
| `STRIPE_SECRET_KEY` | ⭕ | Stripe API key for billing |
| `STRIPE_WEBHOOK_SECRET` | ⭕ | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | ⭕ | Stripe price ID for subscription |
| `OPENAI_API_KEY` | ⭕ | For Strategy Maker AI chat |
| `OWNER_ADMIN_EMAILS` | ⭕ | Comma-separated admin emails (bypass paid check) |
| `BACKEND_ORIGIN` | ⭕ | Override backend URL (default: `https://api.jkmcopilot.com`) |

### 1.2 Firebase Admin JSON Format

Paste as a single-line JSON in Vercel:
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Important:** The `private_key` field must have `\n` for newlines (Vercel handles this).

### 1.3 Firestore Database

The code uses a named database `"jkmdatabase"`. Ensure this exists in Firebase Console:
1. Go to Firebase Console → Firestore Database
2. If using default database, update `lib/firebase-admin.ts`:
   ```ts
   cachedDb = getFirestore(app)  // remove the second parameter
   ```

### 1.4 Build Settings (Vercel)

- **Framework Preset:** Next.js
- **Build Command:** `pnpm run vercel-build` (or default)
- **Output Directory:** `.next`
- **Node.js Version:** 18.x or 20.x

### 1.5 Google OAuth Redirect URIs

In Google Cloud Console, add:
```
https://jkmcopilot.com/api/auth/callback/google
https://www.jkmcopilot.com/api/auth/callback/google
https://<your-project>.vercel.app/api/auth/callback/google
```

### 1.6 Optional: Postgres Setup (for Email/Phone login + Billing)

**Option A: Vercel Postgres (recommended)**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection string to `DATABASE_URL`
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

**Option B: Neon/Supabase**
1. Create Postgres database
2. Get connection string with `?sslmode=require`
3. Set `DATABASE_URL` in Vercel
4. Run: `npx prisma migrate deploy`

**Option C: Firestore-only mode (current default)**
- Leave `DATABASE_URL` unset
- Only Google OAuth will work
- Billing features disabled
- System still functional for core trading features

---

## Part 2: Backend (DigitalOcean) Setup

### 2.1 Required Environment Variables

Create `/root/JKM-AI-BOT/.env`:

```bash
# Core
NOTIFY_MODE=production
DATA_PROVIDER=massive
MASSIVE_API_KEY=your_massive_api_key

# Privacy (REQUIRED)
JKM_PRIVACY_MODE=1

# User data providers (all must be "dashboard")
USER_DB_PROVIDER=dashboard
USER_STRATEGIES_PROVIDER=dashboard
USER_ACCOUNTS_PROVIDER=dashboard
USER_SIGNALS_PROVIDER=dashboard
USER_TELEGRAM_PROVIDER=dashboard

# Dashboard integration (REQUIRED)
DASHBOARD_USER_DATA_URL=https://jkmcopilot.com
DASHBOARD_INTERNAL_API_KEY=<same as Dashboard's DASHBOARD_INTERNAL_API_KEY>

# Backend internal API key (for Dashboard → Backend calls)
INTERNAL_API_KEY=<same as Dashboard's BACKEND_INTERNAL_API_KEY>

# Telegram (optional)
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=JKMCopilotBot
```

### 2.2 Docker Compose (docker-compose.vps.yml)

```yaml
services:
  backend:
    build: .
    container_name: jkm_bot_backend
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:8000:8000"  # Only localhost, nginx proxies
    volumes:
      - ./state:/app/state
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      TZ: UTC
```

### 2.3 Nginx Configuration

Create `/etc/nginx/sites-available/api.jkmcopilot.com`:

```nginx
server {
    listen 80;
    server_name api.jkmcopilot.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.jkmcopilot.com;

    ssl_certificate /etc/letsencrypt/live/api.jkmcopilot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.jkmcopilot.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

Enable and reload:
```bash
ln -sf /etc/nginx/sites-available/api.jkmcopilot.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 2.4 SSL with Certbot

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.jkmcopilot.com
```

### 2.5 Firewall (UFW)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2.6 Deploy Script

One-command deploy (run from VPS):
```bash
cd /root/JKM-AI-BOT
git pull origin main
docker compose -f docker-compose.vps.yml build --no-cache
docker compose -f docker-compose.vps.yml up -d
docker logs -f jkm_bot_backend --tail 50
```

---

## Part 3: Verification Commands

### 3.1 Dashboard Health

From your machine or VPS:
```bash
# Check internal API health (Firestore + Prisma status)
curl -s -H "x-internal-api-key: YOUR_DASHBOARD_INTERNAL_API_KEY" \
  "https://jkmcopilot.com/api/internal/user-data/health?skip_prisma=true" | jq

# Expected response:
# {"ok":true,"checks":{"firestore":{"ok":true},"prisma":{"ok":true,"skipped":true}}}
```

### 3.2 Backend Health

From VPS:
```bash
# Local health check
curl -s http://127.0.0.1:8000/health | jq

# Public health check (via nginx)
curl -s https://api.jkmcopilot.com/health | jq

# Expected response:
# {"ok":true,"uptime_s":...,"massive_configured":true,"dashboard_url":"https://jkmcopilot.com",...}
```

### 3.3 Backend → Dashboard Integration

From VPS:
```bash
# Test backend can reach dashboard internal API
curl -s -H "x-internal-api-key: YOUR_DASHBOARD_INTERNAL_API_KEY" \
  "https://jkmcopilot.com/api/internal/user-data/health?skip_prisma=true" | jq
```

### 3.4 Dashboard → Backend Proxy

From browser or curl:
```bash
# Detectors list (no auth required)
curl -s https://api.jkmcopilot.com/api/detectors | jq '.count'

# Signals list (no auth required for public signals)
curl -s "https://api.jkmcopilot.com/api/signals?limit=5" | jq '.count'
```

### 3.5 Full Integration Test

```bash
# 1. Check Dashboard is up
curl -s -o /dev/null -w "%{http_code}" https://jkmcopilot.com
# Expected: 200

# 2. Check Backend is up
curl -s -o /dev/null -w "%{http_code}" https://api.jkmcopilot.com/health
# Expected: 200

# 3. Check Firestore connectivity
curl -s -H "x-internal-api-key: $KEY" \
  "https://jkmcopilot.com/api/internal/user-data/health?skip_prisma=true" | jq '.checks.firestore.ok'
# Expected: true

# 4. Check Backend can list paid users
docker exec jkm_bot_backend python3 -c "
from core.user_accounts_store import list_active_user_ids
ids = list_active_user_ids()
print(f'Active users: {len(ids)}')
"
```

---

## Part 4: Troubleshooting

### 4.1 Dashboard Build Fails

**Error:** `Cannot find module '@prisma/client'`
```bash
# Solution: Run prisma generate
pnpm prisma generate
```

**Error:** `DATABASE_URL not set`
```bash
# This is OK in Firestore-only mode. The app will run without Prisma features.
# To enable: Set DATABASE_URL in Vercel env vars
```

### 4.2 Firebase Admin Errors

**Error:** `Invalid FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`
- Check JSON is valid (no extra quotes, proper escaping)
- Verify `private_key` has `\n` for newlines

**Error:** `Firestore: NOT_FOUND` or permissions error
- Verify service account has Firestore access
- Check database name: code uses `"jkmdatabase"` - ensure this exists or update code

### 4.3 Backend 401/403 Errors

**Error:** `401 Missing x-internal-api-key`
- Dashboard → Backend: Check `BACKEND_INTERNAL_API_KEY` matches backend's `INTERNAL_API_KEY`
- Backend → Dashboard: Check `DASHBOARD_INTERNAL_API_KEY` matches on both sides

**Debug:**
```bash
# On VPS, check what key backend is using
docker exec jkm_bot_backend printenv | grep -i key
```

### 4.4 CORS Errors

The backend CORS is configured to allow:
- `https://jkmcopilot.com`
- `https://www.jkmcopilot.com`
- `*.vercel.app` (regex)

If you need to debug:
```bash
# Check CORS headers
curl -I -H "Origin: https://jkmcopilot.com" https://api.jkmcopilot.com/health
```

### 4.5 502 Bad Gateway

- Check backend container is running: `docker ps`
- Check nginx config: `nginx -t`
- Check backend logs: `docker logs jkm_bot_backend --tail 100`

### 4.6 Signals Not Appearing

1. Check scanner is running:
```bash
docker exec jkm_bot_backend python3 -c "
from scanner_service import get_scanner_status
print(get_scanner_status())
"
```

2. Check Massive API:
```bash
curl -s https://api.jkmcopilot.com/health | jq '.massive_configured'
```

---

## Part 5: Environment Variables Summary

### Dashboard (Vercel) - Copy/Paste Checklist

```
NEXTAUTH_URL=https://jkmcopilot.com
NEXTAUTH_SECRET=<generate>
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=<full JSON>
USER_DATA_PROVIDER=firebase
DASHBOARD_INTERNAL_API_KEY=<generate and share with backend>
BACKEND_INTERNAL_API_KEY=<generate and share with backend>
```

### Backend (VPS .env) - Copy/Paste Checklist

```
NOTIFY_MODE=production
DATA_PROVIDER=massive
MASSIVE_API_KEY=<from Massive.com>
JKM_PRIVACY_MODE=1
USER_DB_PROVIDER=dashboard
USER_STRATEGIES_PROVIDER=dashboard
USER_ACCOUNTS_PROVIDER=dashboard
USER_SIGNALS_PROVIDER=dashboard
USER_TELEGRAM_PROVIDER=dashboard
DASHBOARD_USER_DATA_URL=https://jkmcopilot.com
DASHBOARD_INTERNAL_API_KEY=<same as Dashboard>
INTERNAL_API_KEY=<same as Dashboard's BACKEND_INTERNAL_API_KEY>
```

---

## Part 6: Known Issues & Status

| Issue | Status | Notes |
|-------|--------|-------|
| Firestore named DB `jkmdatabase` | ⚠️ Check | Ensure this exists or update code |
| Prisma optional mode | ✅ Done | App runs without DATABASE_URL |
| Internal API 500s | ✅ Fixed | Now returns structured error with details |
| CORS config | ✅ Done | Allows jkmcopilot.com + *.vercel.app |
| Privacy mode | ✅ Done | JKM_PRIVACY_MODE=1 enforced |

---

## Quick Deploy Checklist

- [ ] Vercel env vars set (see Part 1.1)
- [ ] Firebase service account JSON correct
- [ ] Firestore database exists
- [ ] Google OAuth redirect URIs configured
- [ ] VPS .env file created (see Part 2.1)
- [ ] Docker container running
- [ ] Nginx configured with SSL
- [ ] UFW firewall enabled
- [ ] Health checks passing (Part 3)
- [ ] Internal API keys matching on both sides
