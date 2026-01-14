import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"
import {
  getUserStrategiesFromFirestore,
  setUserStrategiesInFirestore,
} from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

function usingFirebaseUserData(): boolean {
  return (process.env.USER_DATA_PROVIDER || "").toLowerCase() === "firebase"
}

function allowFirebaseAutoMigration(): boolean {
  const v = (process.env.USER_DATA_MIGRATE_FROM_BACKEND || "").toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

export async function GET(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

  if (usingFirebaseUserData()) {
    try {
      const strategies = await getUserStrategiesFromFirestore(userId)
      if (strategies.length > 0 || !allowFirebaseAutoMigration()) {
        return json(200, { ok: true, strategies })
      }

      // One-time migration: bootstrap Firebase from backend if empty.
      const backendResponse = await forwardInternalRequest(request, {
        method: "GET",
        path: `/api/user/${userId}/strategies`,
      })

      if (!backendResponse.ok) {
        const text = await backendResponse.text()
        return json(backendResponse.status, {
          ok: false,
          message: "Firebase empty and backend fetch failed",
          detail: text,
        })
      }

      const backendData = await backendResponse.json().catch(() => null)
      const backendStrategies = Array.isArray(backendData?.strategies)
        ? backendData.strategies
        : []

      await setUserStrategiesInFirestore(userId, backendStrategies)
      return json(200, { ok: true, strategies: backendStrategies, migrated: true })
    } catch (err: any) {
      return json(500, {
        ok: false,
        message: err?.message || "Failed to load strategies from Firebase",
      })
    }
  }

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/user/${userId}/strategies`,
  })
}

export async function PUT(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

  if (usingFirebaseUserData()) {
    try {
      const body = await request.json().catch(() => null)
      const strategies = body?.strategies
      if (!Array.isArray(strategies)) {
        return json(400, { ok: false, message: "Invalid payload: strategies[] required" })
      }

      await setUserStrategiesInFirestore(userId, strategies)
      return json(200, { ok: true })
    } catch (err: any) {
      return json(500, {
        ok: false,
        message: err?.message || "Failed to save strategies to Firebase",
      })
    }
  }

  // Backend expects POST, but frontend uses PUT for update semantics
  return forwardInternalRequest(request, {
    method: "POST",
    path: `/api/user/${userId}/strategies`,
  })
}

