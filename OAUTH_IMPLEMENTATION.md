# JKM Dashboard - Google OAuth Implementation (v0.1)

## Overview
This document describes the Google OAuth authentication implementation using NextAuth.js (Auth.js) with Next.js App Router, along with the secure backend proxy system.

## Architecture

### Authentication Flow
1. User clicks "Google-ээр нэвтрэх" on `/login` page
2. NextAuth redirects to Google OAuth consent screen
3. After approval, Google redirects back to app with auth code
4. NextAuth exchanges code for tokens and creates session
5. User is redirected to `/dashboard` (protected route)

### Route Protection
- **NO middleware.ts** - All route protection is done server-side
- Protected routes (`/dashboard` and children) check session using `useSession()` hook
- Unauthenticated users are redirected to `/login`

### Secure Backend Proxy
Browser requests NEVER call FastAPI backend directly. All backend calls go through Next.js Route Handlers:

```
Browser → Next.js API Route → FastAPI Backend
         (session check)      (server-to-server with secret header)
```

## Environment Variables

Required in `.env.local`:

```bash
# NextAuth Configuration
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Google OAuth Credentials
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>

# Backend API Configuration
BACKEND_BASE_URL=https://api.jkmcopilot.com
INTERNAL_API_KEY=<shared secret with backend>

# Optional: Frontend API URL
NEXT_PUBLIC_API_BASE_URL=https://api.jkmcopilot.com
```

## Files Created/Modified

### Authentication Setup
- `app/api/auth/[...nextauth]/route.ts` - NextAuth route handler with Google provider
- `lib/auth-server.ts` - Server-side session utilities
- `components/session-provider.tsx` - Client-side SessionProvider wrapper
- `app/layout.tsx` - Wrapped with SessionProvider

### Backend Proxy Routes
- `app/api/proxy/engine/start/route.ts` - POST /api/proxy/engine/start
- `app/api/proxy/engine/stop/route.ts` - POST /api/proxy/engine/stop
- `app/api/proxy/engine/manual-scan/route.ts` - POST /api/proxy/engine/manual-scan
- `app/api/proxy/engine/status/route.ts` - GET /api/proxy/engine/status
- `app/api/proxy/health/route.ts` - GET /api/proxy/health

All proxy routes:
1. Verify session exists using `requireAuth()`
2. Return 401 if no session
3. Forward request to backend with `x-internal-api-key` header
4. Return backend response to client

### UI Updates
- `app/login/page.tsx` - Active "Google-ээр нэвтрэх" button (calls `signIn("google")`)
- `app/dashboard/page.tsx` - Shows logged-in user info + Engine controls (Start/Stop/Manual Scan)
- `lib/api.ts` - Updated to call proxy routes:
  - `api.startScan()` → POST /api/proxy/engine/start
  - `api.stopScan()` → POST /api/proxy/engine/stop
  - `api.manualScan()` → POST /api/proxy/engine/manual-scan
  - `api.engineStatus()` → GET /api/proxy/engine/status
  - `api.health()` → GET /api/proxy/health

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`

## Testing

### Local Development
```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run dev server
pnpm dev

# Open http://localhost:3000
# Click "Google-ээр нэвтрэх"
# After login, you'll be redirected to /dashboard
```

### Verify Implementation
1. Visit `/login` - Google button should be active (not disabled)
2. Click Google button - redirected to Google consent
3. Approve - redirected to `/dashboard`
4. Dashboard shows your name/email
5. Engine controls (Start/Stop/Manual Scan) should call proxy routes
6. Check Network tab - API calls go to `/api/proxy/*` NOT directly to backend

## Security Features

✅ Session-based authentication (no exposed JWT in browser)
✅ Server-side route protection (no client-side bypass possible)
✅ Backend API never exposed to browser
✅ Shared secret header between Next.js and FastAPI
✅ All sensitive operations require valid session

## Backward Compatibility

Existing code continues to work:
- `api.metrics()`, `api.signals()`, `api.symbols()` - unchanged
- `api.strategies()`, `api.logs()`, `api.health()` - unchanged
- `api.profile()`, `api.updateProfile()` - unchanged
- Engine methods now route through secure proxy

## Production Deployment

### Vercel
1. Set environment variables in Vercel dashboard
2. Update `AUTH_URL` to production domain
3. Add production redirect URI to Google OAuth settings
4. Ensure `AUTH_TRUST_HOST=true` is set

### Backend Configuration
Ensure FastAPI backend:
1. Accepts requests from Next.js server IP
2. Validates `x-internal-api-key` header
3. Has CORS disabled (not needed for server-to-server)

## Notes

- NO `middleware.ts` file exists (per requirements)
- Vercel Analytics removed from package.json
- Demo email/password login still available but shows message to use Google
- All engine operations logged in dashboard UI with success/error messages
