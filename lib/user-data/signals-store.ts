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
  updatedAt?: string
  createdAt?: string
}

const USERS_COLLECTION = "users"

/**
 * Upsert a signal for a user in Firestore.
 * Creates or updates the signal document in users/{userId}/signals/{signalKey}.
 */
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

/**
 * List signals for a user from Firestore.
 * 
 * @param userId - User ID to list signals for
 * @param options - Filtering options
 * @returns Array of signals ordered by createdAt desc
 */
export async function listUserSignals(
  userId: string,
  options?: {
    limit?: number
    symbol?: string | null
    status?: string | null
  }
): Promise<StoredSignal[]> {
  const db = getFirebaseAdminDb()

  const signalsRef = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("signals")

  // Start with base query, ordered by createdAt desc
  let query = signalsRef.orderBy("createdAt", "desc")

  // Apply filters
  if (options?.symbol) {
    query = query.where("symbol", "==", options.symbol)
  }

  if (options?.status) {
    query = query.where("status", "==", options.status)
  }

  // Apply limit
  const limit = options?.limit || 50
  query = query.limit(limit)

  const snap = await query.get()
  const signals: StoredSignal[] = []

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>
    signals.push({
      signal_key: String(data.signal_key || doc.id),
      user_id: String(data.user_id || userId),
      symbol: String(data.symbol || ""),
      direction: String(data.direction || ""),
      timeframe: String(data.timeframe || ""),
      entry: Number(data.entry || 0),
      sl: Number(data.sl || 0),
      tp: Number(data.tp || 0),
      rr: Number(data.rr || 0),
      strategy_name: data.strategy_name ? String(data.strategy_name) : undefined,
      generated_at: data.generated_at ? String(data.generated_at) : undefined,
      status: data.status ? String(data.status) : undefined,
      evidence: data.evidence,
      meta: data.meta,
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      createdAt: data.createdAt ? String(data.createdAt) : undefined,
    })
  }

  return signals
}

/**
 * Get a single signal by key.
 */
export async function getUserSignal(userId: string, signalKey: string): Promise<StoredSignal | null> {
  const db = getFirebaseAdminDb()

  const ref = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("signals")
    .doc(signalKey)

  const snap = await ref.get()
  if (!snap.exists) return null

  const data = snap.data() as Record<string, unknown>
  return {
    signal_key: String(data.signal_key || signalKey),
    user_id: String(data.user_id || userId),
    symbol: String(data.symbol || ""),
    direction: String(data.direction || ""),
    timeframe: String(data.timeframe || ""),
    entry: Number(data.entry || 0),
    sl: Number(data.sl || 0),
    tp: Number(data.tp || 0),
    rr: Number(data.rr || 0),
    strategy_name: data.strategy_name ? String(data.strategy_name) : undefined,
    generated_at: data.generated_at ? String(data.generated_at) : undefined,
    status: data.status ? String(data.status) : undefined,
    evidence: data.evidence,
    meta: data.meta,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
  }
}

/**
 * Update signal status (e.g., hit_tp, hit_sl, expired).
 */
export async function updateSignalStatus(
  userId: string,
  signalKey: string,
  status: string,
  extra?: { resolved_at?: string; resolved_price?: number }
): Promise<void> {
  const db = getFirebaseAdminDb()

  const ref = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("signals")
    .doc(signalKey)

  const update: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  }

  if (extra?.resolved_at) update.resolved_at = extra.resolved_at
  if (extra?.resolved_price !== undefined) update.resolved_price = extra.resolved_price

  await ref.set(update, { merge: true })
}

/**
 * Delete a signal.
 */
export async function deleteUserSignal(userId: string, signalKey: string): Promise<void> {
  const db = getFirebaseAdminDb()

  const ref = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("signals")
    .doc(signalKey)

  await ref.delete()
}
