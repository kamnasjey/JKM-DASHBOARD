# JKM Dashboard - Production Runbook

## Overview

This dashboard runs in **Firestore-only mode (Path-2)** by default:
- ✅ Google OAuth authentication
- ✅ Firestore as canonical user data store
- ❌ Email/Password login (requires Postgres)
- ❌ Phone/OTP login (requires Postgres)
- ❌ Stripe billing (disabled by default)

## Architecture

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
```

---

## Required Environment Variables (Vercel)

### Core (REQUIRED)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Production URL: `https://jkmcopilot.com` |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | Full service account JSON (one-liner) |
| `USER_DATA_PROVIDER` | Set to `firebase` |
| `DASHBOARD_INTERNAL_API_KEY` | For backend → dashboard calls |
| `BACKEND_INTERNAL_API_KEY` | For dashboard → backend calls |

### Optional

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres URL. If set, enables Email/Phone login |
| `BILLING_DISABLED` | Set to `1` to disable billing (default) |
| `STRIPE_SECRET_KEY` | Stripe API key (only if billing enabled) |
| `STRIPE_PRICE_ID` | Stripe price ID (only if billing enabled) |
| `OPENAI_API_KEY` | For Strategy Maker AI chat |
| `OWNER_ADMIN_EMAILS` | Comma-separated admin emails |
| `BACKEND_API_URL` | Override backend URL (default: api.jkmcopilot.com) |

---

## Firebase Admin JSON Format

Paste as a single-line JSON in Vercel:
```json
{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important:** The `private_key` field must have `\n` for newlines.

---

## Google OAuth Setup

In Google Cloud Console, add these redirect URIs:
```
https://jkmcopilot.com/api/auth/callback/google
https://www.jkmcopilot.com/api/auth/callback/google
https://<your-project>.vercel.app/api/auth/callback/google
```

---

## Verification Commands

### 1. Public Health Check

```bash
curl -s https://jkmcopilot.com/api/health | jq
```

Expected response:
```json
{
  "ok": true,
  "env": {
    "nextauth": { "configured": true },
    "firestore": { "ok": true },
    "prisma": { "configured": false, "mode": "firestore-only" }
  },
  "mode": "firestore-only"
}
```

### 2. Auth Mode Check

```bash
curl -s https://jkmcopilot.com/api/auth/mode | jq
```

Expected response:
```json
{
  "ok": true,
  "google": true,
  "email": false,
  "phone": false,
  "mode": "google-only"
}
```

### 3. Internal API Health (requires API key)

```bash
curl -s -H "x-internal-api-key: YOUR_KEY" \
  "https://jkmcopilot.com/api/internal/user-data/health" | jq
```

Expected response:
```json
{
  "ok": true,
  "checks": {
    "firestore": { "ok": true },
    "prisma": { "ok": true, "disabled": true, "skipped": true }
  },
  "mode": "firestore-only"
}
```

---

## Common Errors & Solutions

### Error: "Configuration" on login page

**Cause:** Missing or invalid NextAuth configuration.

**Solution:** Check these env vars in Vercel:
- `NEXTAUTH_URL` (must match your domain exactly)
- `NEXTAUTH_SECRET` (must be set)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Error: "AccessDenied" after Google login

**Cause:** Usually a redirect URI mismatch or Firestore permission issue.

**Solution:**
1. Check Google Cloud Console redirect URIs
2. Verify Firestore rules allow read/write
3. Check `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` is valid

### Error: Firebase Admin initialization failed

**Cause:** Invalid or missing service account JSON.

**Solution:**
1. Ensure JSON is a single line (no actual newlines except in private_key)
2. Check `private_key` has `\n` escape sequences
3. Verify service account has Firestore access

### Error: 503 on billing routes

**Cause:** Expected behavior in Firestore-only mode.

**Solution:** This is normal. Billing is disabled without Postgres.

### Error: Email/Phone login shows "disabled" message

**Cause:** Expected behavior in Firestore-only mode.

**Solution:** This is normal. Use Google OAuth instead.

---

## Enabling Full Mode (Optional)

To enable Email/Phone login and billing:

1. **Add Postgres database:**
   - Vercel Postgres, Neon, or Supabase
   - Set `DATABASE_URL` in Vercel

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Enable billing:**
   - Remove `BILLING_DISABLED=1` or set to `0`
   - Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`

4. **Redeploy**

---

## Backend Integration

The backend (DigitalOcean) communicates with dashboard via internal API:

- **Dashboard → Backend:** Uses `BACKEND_INTERNAL_API_KEY`
- **Backend → Dashboard:** Uses `DASHBOARD_INTERNAL_API_KEY`

Backend should set:
```bash
DASHBOARD_USER_DATA_URL=https://jkmcopilot.com
DASHBOARD_INTERNAL_API_KEY=<same as dashboard>
USER_DB_PROVIDER=dashboard
USER_STRATEGIES_PROVIDER=dashboard
USER_ACCOUNTS_PROVIDER=dashboard
USER_SIGNALS_PROVIDER=dashboard
```

---

## Quick Checklist

- [ ] `NEXTAUTH_URL` = `https://jkmcopilot.com`
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set
- [ ] `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` valid JSON
- [ ] `USER_DATA_PROVIDER` = `firebase`
- [ ] `DASHBOARD_INTERNAL_API_KEY` set
- [ ] `BACKEND_INTERNAL_API_KEY` set
- [ ] `BILLING_DISABLED` = `1` (unless using Postgres)
- [ ] Google OAuth redirect URIs configured
- [ ] `/api/health` returns `ok: true`
