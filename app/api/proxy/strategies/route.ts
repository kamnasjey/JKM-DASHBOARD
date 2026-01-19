import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"
import {
  getUserStrategiesFromFirestore,
  setUserStrategiesInFirestore,
} from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

  try {
    const strategies = await getUserStrategiesFromFirestore(userId)
    return json(200, { ok: true, strategies })
  } catch (err: any) {
    return json(500, {
      ok: false,
      message: err?.message || "Failed to load strategies from Firestore",
    })
  }
}

export async function PUT(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

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
      message: err?.message || "Failed to save strategies to Firestore",
    })
  }
}

