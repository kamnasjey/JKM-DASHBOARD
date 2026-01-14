# JKM Trading Dashboard

*Production trading signals and portfolio management dashboard*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/kamnasjey-4556s-projects/v0-trading-dashboard-ui)

## Overview

Full-featured trading dashboard with:
- 🔐 Auth (Email/Password + Phone OTP + Google OAuth)
- 💳 Stripe billing / paid access gating
- 📊 Real-time signals from backend API
- 🛡️ Secure server-side proxy (no API keys exposed to client)
- 🔥 **Firebase Firestore as canonical user database**

---

## 🔥 Firebase is the Canonical User Database

**Firebase Firestore is the single source of truth** for all user-related data:
- User identity (email, name, has_paid_access)
- User preferences (telegram_chat_id, scan_enabled, etc.)
- User strategies (stored in user doc)
- User signal history (subcollection)

### Data Architecture

```
Firestore Database: jkmdatabase
└── Collection: users/{userId}
    ├── user_id (string)
    ├── email (string|null)
    ├── name (string|null)
    ├── has_paid_access (boolean)
    ├── plan (string|null)
    ├── plan_status (string|null)
    ├── telegram_chat_id (string|null)
    ├── telegram_enabled (boolean|null)
    ├── telegram_connected_ts (number|null)
    ├── scan_enabled (boolean|null)
    ├── strategies (array)
    ├── updatedAt (string ISO)
    └── Subcollection: signals/{signalKey}
        ├── signal_key, user_id, symbol, direction, timeframe
        ├── entry, sl, tp, rr
        ├── strategy_name, generated_at, status
        └── createdAt, updatedAt
```

### Internal API Endpoints

The Python backend accesses user data via these internal endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/internal/user-data/users` | GET | List paid users (with Firestore prefs) |
| `/api/internal/user-data/users/{userId}` | GET | Get user identity + prefs |
| `/api/internal/user-data/users/{userId}` | PUT | Update identity and/or prefs |
| `/api/internal/user-data/strategies/{userId}` | GET/PUT | Get/set user strategies |
| `/api/internal/user-data/signals` | GET | List signals for user |
| `/api/internal/user-data/signals` | POST | Upsert a signal |
| `/api/internal/user-data/health` | GET | Health check |

All endpoints require `x-internal-api-key` header matching `DASHBOARD_INTERNAL_API_KEY`.

### Migration from Prisma/Local

Run the migration script to sync Prisma users to Firestore:

```bash
# Preview changes
npx tsx scripts/migrate_legacy_users_to_firestore.ts --dry-run

# Run migration
npx tsx scripts/migrate_legacy_users_to_firestore.ts
```

---

## 🚀 Deployment Checklist (Vercel + Postgres)

### 1. Database Setup (REQUIRED)

**Production requires PostgreSQL** (file-based SQLite is ephemeral on Vercel).

Recommended options:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)

Get your connection string:
```
postgresql://user:password@host:5432/dbname?sslmode=require
```

### 2. Vercel Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXTAUTH_URL` | ✅ | `https://jkmcopilot.com` (your domain) |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `BACKEND_INTERNAL_API_KEY` | ✅ | Internal API key for backend proxy |
| `DASHBOARD_INTERNAL_API_KEY` | ✅ | Internal API key for Python backend |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | ✅ | Firebase service account JSON |
| `OWNER_ADMIN_EMAILS` | ⭕ | Comma-separated emails to bypass payment |
| `NEXT_PUBLIC_LAUNCH_MODE` | ⭕ | `"live"` (default) or `"coming-soon"` |

### 3. Google OAuth Setup

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

**Authorized redirect URIs:**
```
https://jkmcopilot.com/api/auth/callback/google
https://www.jkmcopilot.com/api/auth/callback/google
https://your-project.vercel.app/api/auth/callback/google
```

### 4. Vercel Build Configuration

**Build Command** (set in Vercel or use default):
```
pnpm run vercel-build
```

This runs:
1. `prisma generate` — Generate Prisma Client
2. `prisma migrate deploy` — Apply pending migrations
3. `next build` — Build Next.js app

### 5. Stripe Webhook

Create webhook in [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
- Endpoint: `https://jkmcopilot.com/api/billing/webhook`
- Events: `checkout.session.completed`

---

## 🛠️ Local Development

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env.local
# Edit .env.local with your values

# 3. For local dev with SQLite (optional):
# Change prisma/schema.prisma: provider = "sqlite"
# Set DATABASE_URL="file:./dev.db" in .env.local

# 4. Generate Prisma Client
pnpm prisma:generate

# 5. Create/apply migrations (local dev)
pnpm prisma:migrate:dev

# 6. Start dev server
pnpm dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate:dev` | Create migration (dev only) |
| `pnpm prisma:migrate:deploy` | Apply migrations (production) |
| `pnpm vercel-build` | Full Vercel build with migrations |

---

## ✅ Verification Commands

After deployment, verify:

```bash
# 1. Check build locally
pnpm install
pnpm prisma:generate
pnpm build

# 2. Test auth flows
# - Visit /auth/register → create account → redirects to /billing or /dashboard
# - Visit /auth/login → login → redirects to /dashboard
# - Google login → redirects to /dashboard

# 3. Check API endpoints (when logged in)
# - /api/proxy/health → backend health
# - /api/billing/status → billing status
```

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── auth/               # Login, Register, Verify
│   ├── billing/            # Payment page
│   ├── dashboard/          # Main dashboard
│   ├── repair/             # Owner-only diagnostics
│   └── api/                # API routes
│       ├── auth/           # NextAuth endpoints
│       ├── billing/        # Stripe checkout + webhook
│       └── proxy/          # Secure backend proxy
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and helpers
├── prisma/                 # Database schema + migrations
└── public/                 # Static assets
```

---

## 🔒 Security Notes

- All backend API calls go through `/api/proxy/*` — internal API key never exposed to client
- Stripe webhook validates signature before processing
- Owner bypass only works for emails in `OWNER_ADMIN_EMAILS`
- Phone OTP uses mock code `123456` in development (replace with real SMS in production)
