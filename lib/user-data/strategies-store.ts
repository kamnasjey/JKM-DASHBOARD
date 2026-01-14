import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export type Strategy = {
  strategy_id: string
  name: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  description?: string
}

type UserDoc = {
  user_id?: string
  strategies?: Strategy[]
  updatedAt?: string
}

const USERS_COLLECTION = "users"

/** Maximum strategies per user (same as Python backend) */
export const MAX_STRATEGIES_PER_USER = 30

export async function getUserStrategiesFromFirestore(userId: string): Promise<Strategy[]> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)
  const snap = await ref.get()

  if (!snap.exists) return []

  const data = snap.data() as UserDoc | undefined
  const strategies = Array.isArray(data?.strategies) ? data?.strategies : []

  // Defensive: ensure each has required fields
  return strategies
    .filter((s: any) => s && typeof s.strategy_id === "string")
    .map((s: any) => ({
      strategy_id: String(s.strategy_id),
      name: String(s.name || s.strategy_id),
      enabled: Boolean(s.enabled),
      detectors: Array.isArray(s.detectors) ? s.detectors.map(String) : [],
      min_score: s.min_score !== undefined ? Number(s.min_score) : undefined,
      min_rr: s.min_rr !== undefined ? Number(s.min_rr) : undefined,
      description: s.description !== undefined ? String(s.description) : undefined,
    }))
}

/**
 * Set user strategies in Firestore.
 * Enforces MAX_STRATEGIES_PER_USER limit.
 * 
 * @throws Error if strategies exceed limit
 */
export async function setUserStrategiesInFirestore(userId: string, strategies: Strategy[]): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)

  const cleaned = (Array.isArray(strategies) ? strategies : []).map((s) => ({
    strategy_id: String(s.strategy_id),
    name: String(s.name || s.strategy_id),
    enabled: Boolean(s.enabled),
    detectors: Array.isArray(s.detectors) ? s.detectors.map(String) : [],
    min_score: s.min_score !== undefined ? Number(s.min_score) : undefined,
    min_rr: s.min_rr !== undefined ? Number(s.min_rr) : undefined,
    description: s.description !== undefined ? String(s.description) : undefined,
  }))

  // Enforce max strategies limit
  if (cleaned.length > MAX_STRATEGIES_PER_USER) {
    throw new Error(`Maximum ${MAX_STRATEGIES_PER_USER} strategies allowed per user. You have ${cleaned.length}.`)
  }

  await ref.set(
    {
      user_id: userId,
      strategies: cleaned,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}
