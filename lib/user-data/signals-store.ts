import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export type StoredSignal = {
  signal_key: string
  user_id: string
  symbol: string
  direction: string
  timeframe: string
  entry: number
  sl: number
  tp: number
  rr: number
  strategy_name?: string
  generated_at?: string
  status?: string
  evidence?: unknown
  meta?: unknown
}

const USERS_COLLECTION = "users"

export async function upsertUserSignal(userId: string, signalKey: string, payload: StoredSignal): Promise<void> {
  const db = getFirebaseAdminDb()

  const ref = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("signals")
    .doc(signalKey)

  await ref.set(
    {
      ...payload,
      user_id: userId,
      signal_key: signalKey,
      updatedAt: new Date().toISOString(),
      createdAt: payload.generated_at || new Date().toISOString(),
    },
    { merge: true },
  )
}
