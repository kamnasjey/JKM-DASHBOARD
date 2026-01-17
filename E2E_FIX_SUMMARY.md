# E2E Fix Summary - JKM COPILOT

**Date**: 2025-01-XX  
**Scope**: Strategy Maker, Detector Naming, Simulator Hardening, Versioning

---

## ✅ Completed Tasks

### 1. Versioning (Dashboard + Backend)

**Dashboard** - [lib/version.ts](lib/version.ts)
```typescript
// Uses NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA or "dev"
getDashboardVersion(): string
getDashboardVersionInfo(): { short, long, buildTime }
```

**Backend** - `core/version.py`
```python
SIM_VERSION = os.environ.get("SIM_VERSION", "dev")
get_version_info() → {"sim_version", "build_time", "env"}
```

---

### 2. Detector EN/MN Labels

**File**: [lib/detectors/catalog.ts](lib/detectors/catalog.ts)

All 31 detectors now have:
- `labelEn` - English label (PRIMARY)
- `labelMn` - Mongolian label (SECONDARY)
- `descEn` - English description (PRIMARY)
- `descriptionMn` - Mongolian description (legacy)

Example:
```typescript
BREAK_RETEST: {
  labelEn: "Breakout Retest",
  labelMn: "Breakout дахин тест",
  descEn: "Enters after price retests a broken S/R level",
  // ...
}
```

---

### 3. Normalization Single Helper

**File**: [lib/detectors/normalize.ts](lib/detectors/normalize.ts)

```typescript
// Key exports
normalizeDetectorId(raw: string): string
normalizeDetectorIds(detectors: string[]): NormalizeResult
normalizeDetectorList(detectors: string[]): string[]
isValidDetectorId(detectorId: string): boolean
getUnknownDetectors(detectors: string[]): string[]

// NormalizeResult interface
interface NormalizeResult {
  requested: string[]
  normalized: string[]
  unknown: string[]
}
```

**Aliases handled**:
- `BREAKOUT_RETEST_ENTRY` → `BREAK_RETEST`
- Whitespace trimming
- Uppercase normalization

---

### 4. Strategy Maker Save Bug Fix

**File**: [components/strategy-maker-panel.tsx](components/strategy-maker-panel.tsx)

Changes:
- Shows actual server error message (not generic "Алдаа")
- Shows HTTP status code in toast
- Validation warning panel near Save button
- Save button disabled when invalid with clear message

---

### 5. Simulator Hardening

**File**: [app/api/simulator/run/route.ts](app/api/simulator/run/route.ts)

Changes:
- Every response has `requestId: crypto.randomUUID()`
- Every response has `meta.dashboardVersion` and `meta.simVersion`
- Every response has `meta.elapsedMs`
- 0 trades always includes `explainability` block with `rootCause`
- Backend timeout/error returns 502 with `BACKEND_UNREACHABLE`

Response shape:
```json
{
  "trades": [],
  "metrics": { "tradeCount": 0 },
  "meta": {
    "requestId": "abc-123",
    "dashboardVersion": "git:a1b2c3d",
    "simVersion": "2.4.0",
    "elapsedMs": 1234,
    "detectorsRequested": [...],
    "detectorsNormalized": [...],
    "detectorsUnknown": [...]
  },
  "explainability": {
    "rootCause": "gate_filtered",
    "explanation": "...",
    "suggestions": [...]
  }
}
```

---

### 6. Data Gap Warnings UI

**File**: [components/simulator/zero-trades-debug-panel.tsx](components/simulator/zero-trades-debug-panel.tsx)

New features:
- Data coverage warning when `missingPct >= 20%`
- Quick fix buttons: "Try 90 Days", "Try 1H/4H"
- All labels now English as primary
- Version badges (`sim:`, `dash:`) displayed

---

### 7. Legacy Route Deprecation

**File**: [app/api/proxy/strategy-sim/run/route.ts](app/api/proxy/strategy-sim/run/route.ts)

Returns **410 Gone**:
```json
{
  "error": "DEPRECATED_ENDPOINT",
  "message": "This endpoint is deprecated. Use /api/simulator/run instead.",
  "trades": [],
  "metrics": { "tradeCount": 0 }
}
```

---

### 8. Backend Health Check

**File**: `core/detectors_health.py` (to be deployed)

Endpoint: `GET /health/detectors`

Response:
```json
{
  "ok": true,
  "count": 31,
  "loaded": ["BREAK_RETEST", "EMA_CROSS", ...],
  "failed": [],
  "byCategory": {
    "gate": ["GATE_VOLATILITY", ...],
    "trigger": ["EMA_CROSS", ...],
    "confluence": ["FVG_ALIGN", ...]
  },
  "simVersion": "git:a1b2c3d"
}
```

---

## 📦 Environment Variables

### Dashboard (Vercel / .env.local)
```bash
# Auto-set by Vercel
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=<git-sha>

# Backend URL
NEXT_PUBLIC_BOT_API_URL=https://your-backend.com
```

### Backend (Docker / .env)
```bash
# Set during docker build or runtime
SIM_VERSION=git:$(git rev-parse --short HEAD)
```

---

## 🧪 Smoke Test Commands

### 1. Dashboard API - Detectors
```bash
curl -s https://www.jkmcopilot.com/api/detectors | jq '.detectors | length'
# Expected: 31

curl -s https://www.jkmcopilot.com/api/detectors | jq '.version'
# Expected: "git:abc1234" or "dev"
```

### 2. Dashboard API - Simulator
```bash
curl -X POST https://www.jkmcopilot.com/api/simulator/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframes": ["1h"],
    "detectors": ["BREAK_RETEST", "EMA_CROSS"],
    "from": "2025-01-01",
    "to": "2025-01-15"
  }' | jq '.meta.requestId, .meta.dashboardVersion'
# Expected: UUID and version string
```

### 3. Dashboard API - Deprecated Route
```bash
curl -i https://www.jkmcopilot.com/api/proxy/strategy-sim/run
# Expected: HTTP/1.1 410 Gone
```

### 4. Backend API - Health Check
```bash
curl -s https://your-backend.com/health/detectors | jq '.ok, .count'
# Expected: true, 31
```

### 5. Backend API - Version
```bash
curl -s https://your-backend.com/health | jq '.sim_version'
# Expected: "git:abc1234"
```

---

## 🚀 Deploy Commands

### Backend (VPS via SSH)

```bash
# 1. SSH into server
ssh root@159.65.11.255

# 2. Navigate to project
cd /root

# 3. Pull latest code
git pull origin main

# 4. Build with version tag
export SIM_VERSION="git:$(git rev-parse --short HEAD)"
docker compose build --build-arg SIM_VERSION="$SIM_VERSION" backend

# 5. Deploy
docker compose up -d --force-recreate backend

# 6. Verify
docker logs -f --tail 100 jkm_bot_backend

# 7. Test health
curl -s http://localhost:8000/health/detectors | jq '.ok'
```

### Dashboard (Vercel)

```bash
# Push to main triggers auto-deploy
git push origin main

# Or manual deploy
vercel --prod
```

---

## 📝 Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/version.ts` | NEW | Dashboard version utilities |
| `lib/detectors/catalog.ts` | MODIFIED | Added EN/MN labels to all detectors |
| `lib/detectors/normalize.ts` | NEW | Centralized normalization helper |
| `components/detectors/detector-select.tsx` | MODIFIED | EN as primary label |
| `components/strategy-maker-panel.tsx` | MODIFIED | Better error surfacing |
| `app/api/simulator/run/route.ts` | MODIFIED | Hardened with meta, explain |
| `app/api/detectors/route.ts` | MODIFIED | Include EN labels, version |
| `app/api/proxy/strategy-sim/run/route.ts` | DEPRECATED | Returns 410 Gone |
| `app/simulator/page.tsx` | MODIFIED | Version display in header |
| `components/simulator/zero-trades-debug-panel.tsx` | MODIFIED | EN labels, data gap UI |
| `core/version.py` | NEW (backend) | Backend version module |
| `core/detectors_health.py` | NEW (backend) | Health check endpoint |

---

## ⚠️ Breaking Changes

1. **Deprecated Route**: `/api/proxy/strategy-sim/run` now returns 410
   - Migrate to: `/api/simulator/run`

2. **Response Shape**: Simulator responses now always include:
   - `meta.requestId`
   - `meta.dashboardVersion`
   - `explainability` block when 0 trades

3. **Detector Labels**: Primary label is now `labelEn` (English)
   - `labelMn` still available for Mongolian UI

---

## 🔍 Troubleshooting

### "0 trades but no explainability"
- Check backend version: needs `core/version.py` deployed
- Run smoke test #4 to verify health endpoint

### "Unknown detectors warning"
- Check `meta.detectorsUnknown` in response
- Use `normalizeDetectorList()` before saving

### "Save error - generic message"
- Check network tab for actual error response
- Toast should now show server message

### "Version shows 'dev'"
- Dashboard: Check `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` env var
- Backend: Check `SIM_VERSION` env var

---

## ✨ Next Steps

1. [ ] Deploy backend changes to VPS
2. [ ] Push dashboard to Vercel
3. [ ] Run all smoke tests
4. [ ] Monitor error rates in production
5. [ ] Consider adding Sentry for error tracking
