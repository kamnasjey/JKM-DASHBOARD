# Troubleshooting: Internal sync 500 (strategies)

## Symptom
The backend (Python) calls the dashboard internal endpoint and gets `500`:

- `GET /api/internal/user-data/strategies/{userId}`
- or `PUT /api/internal/user-data/strategies/{userId}`

UI/Backend logs often show something like: **“Failed to sync strategies to dashboard… 500”**.

## What changed
The internal endpoint now returns a structured JSON error (and logs server-side details) instead of an unhelpful generic 500.

File: [app/api/internal/user-data/strategies/[userId]/route.ts](app/api/internal/user-data/strategies/[userId]/route.ts)

## Quick checklist
1. Verify the backend sends header:
   - `x-internal-api-key: <value>`
2. Verify Vercel env vars:
   - `DASHBOARD_INTERNAL_API_KEY` (must match backend’s header value)
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` (or split admin vars)
3. Verify Firestore access:
   - The Firebase service account must have access to Firestore
   - The Firestore database name in [lib/firebase-admin.ts](lib/firebase-admin.ts) is currently `"jkmdatabase"` (named database). If your project uses the default database, this can be a cause.

## Repro (manual)
From any HTTP client:

- Call:
  - `GET https://<dashboard-domain>/api/internal/user-data/strategies/<userId>`
- Include header:
  - `x-internal-api-key: <DASHBOARD_INTERNAL_API_KEY>`

If it fails, you should now see:
- `ok: false`
- `message: "Internal strategies GET failed"`
- `details: "..."` (safe error message)

## What to paste as “алдааны мөрүүд” (error lines)
From Vercel logs (or local `pnpm dev` server logs), paste:
- The full JSON response body from the failing endpoint
- The `details` string
- The server log line that starts with:
  - `[internal strategies GET] failed`
  - or `[internal strategies PUT] failed`

That output is designed to be actionable but not leak secrets.
