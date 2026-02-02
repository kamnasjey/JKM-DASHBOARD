/**
 * user-store.ts
 * 
 * Firestore-backed user identity and preferences store.
 * This is the canonical source of truth for user data in production.
 * 
 * Collection: users/{userId}
 * Fields:
 *   - user_id (string)
 *   - email (string|null)
 *   - name (string|null)
 *   - has_paid_access (bool)
 *   - plan (string|null)
 *   - plan_status (string|null)
 *   - telegram_chat_id (string|null)
 *   - telegram_enabled (bool|null)
 *   - telegram_connected_ts (number|null)
 *   - scan_enabled (bool|null)
 *   - strategies (array) - managed by strategies-store.ts
 *   - updatedAt (string ISO)
 * 
 * Subcollection:
 *   - users/{userId}/signals/{signalKey} - managed by signals-store.ts
 */

import { getFirebaseAdminDb } from "@/lib/firebase-admin"

const USERS_COLLECTION = "users"

export type UserIdentity = {
  user_id: string
  email?: string | null
  name?: string | null
  display_name?: string | null
  has_paid_access?: boolean
  plan?: string | null
  plan_status?: string | null
}

export type UserPrefs = {
  telegram_chat_id?: string | null
  telegram_enabled?: boolean | null
  telegram_connected_ts?: number | null
  scan_enabled?: boolean | null
  plan?: string | null
  plan_status?: string | null
}

export type UserDoc = UserIdentity & UserPrefs & {
  strategies?: unknown[]
  updatedAt?: string
  createdAt?: string
}

/**
 * Get user document from Firestore.
 * Returns null if user doesn't exist.
 */
export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)
  const snap = await ref.get()

  if (!snap.exists) return null

  const data = snap.data() as Record<string, unknown> | undefined
  if (!data) return null

  return {
    user_id: String(data.user_id || userId),
    email: data.email !== undefined ? (data.email as string | null) : null,
    name: data.name !== undefined ? (data.name as string | null) : null,
    display_name: data.display_name !== undefined ? (data.display_name as string | null) : null,
    has_paid_access: Boolean(data.has_paid_access),
    plan: data.plan !== undefined ? (data.plan as string | null) : null,
    plan_status: data.plan_status !== undefined ? (data.plan_status as string | null) : null,
    telegram_chat_id: data.telegram_chat_id !== undefined ? (data.telegram_chat_id as string | null) : null,
    telegram_enabled: data.telegram_enabled !== undefined ? Boolean(data.telegram_enabled) : null,
    telegram_connected_ts: data.telegram_connected_ts !== undefined ? Number(data.telegram_connected_ts) : null,
    scan_enabled: data.scan_enabled !== undefined ? Boolean(data.scan_enabled) : null,
    strategies: Array.isArray(data.strategies) ? data.strategies : undefined,
    updatedAt: data.updatedAt !== undefined ? String(data.updatedAt) : undefined,
    createdAt: data.createdAt !== undefined ? String(data.createdAt) : undefined,
  }
}

/**
 * Upsert user identity fields (email, name, has_paid_access, plan, plan_status).
 * Uses Firestore merge to preserve existing fields.
 */
export async function upsertUserIdentity(userId: string, identity: Partial<UserIdentity>): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)

  const update: Record<string, unknown> = {
    user_id: userId,
    updatedAt: new Date().toISOString(),
  }

  if (identity.email !== undefined) update.email = identity.email
  if (identity.name !== undefined) update.name = identity.name
  if (identity.display_name !== undefined) update.display_name = identity.display_name
  if (identity.has_paid_access !== undefined) update.has_paid_access = Boolean(identity.has_paid_access)
  if (identity.plan !== undefined) update.plan = identity.plan
  if (identity.plan_status !== undefined) update.plan_status = identity.plan_status

  await ref.set(update, { merge: true })
}

/**
 * Update user preferences (telegram, scan_enabled, etc.).
 * Uses Firestore merge to preserve existing fields.
 */
export async function updateUserPrefs(userId: string, prefs: Partial<UserPrefs>): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)

  const update: Record<string, unknown> = {
    user_id: userId,
    updatedAt: new Date().toISOString(),
  }

  if (prefs.telegram_chat_id !== undefined) update.telegram_chat_id = prefs.telegram_chat_id
  if (prefs.telegram_enabled !== undefined) update.telegram_enabled = prefs.telegram_enabled
  if (prefs.telegram_connected_ts !== undefined) update.telegram_connected_ts = prefs.telegram_connected_ts
  if (prefs.scan_enabled !== undefined) update.scan_enabled = prefs.scan_enabled
  if (prefs.plan !== undefined) update.plan = prefs.plan
  if (prefs.plan_status !== undefined) update.plan_status = prefs.plan_status

  // Handle strategies field deletion (strategies should be in subcollection, not here)
  const { FieldValue } = await import("firebase-admin/firestore")
  let deleteStrategies = false
  if ((prefs as any).strategies !== undefined) {
    const strats = (prefs as any).strategies
    if (strats === null || (Array.isArray(strats) && strats.length === 0)) {
      // Delete the field - must use update() not set()
      deleteStrategies = true
    } else {
      update.strategies = strats
    }
  }

  await ref.set(update, { merge: true })

  // FieldValue.delete() only works with update(), not set()
  if (deleteStrategies) {
    await ref.update({ strategies: FieldValue.delete() })
  }
}

/**
 * List all users from Firestore with optional filter.
 * For production, this replaces the Prisma-based user listing.
 */
export async function listUsersFromFirestore(options?: {
  onlyPaid?: boolean
  limit?: number
}): Promise<UserDoc[]> {
  const db = getFirebaseAdminDb()
  // Note: compound queries (where + orderBy on different fields) require Firestore index
  // For now, filter client-side to avoid index requirement
  let query: FirebaseFirestore.Query = db.collection(USERS_COLLECTION)

  if (options?.onlyPaid) {
    // Use only the where clause, sort client-side to avoid index requirement
    query = query.where("has_paid_access", "==", true)
  }

  if (options?.limit && !options?.onlyPaid) {
    // Only apply limit if not filtering (we'll limit after client-side sort)
    query = query.limit(options.limit)
  }

  const snap = await query.get()
  const users: UserDoc[] = []

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>
    users.push({
      user_id: String(data.user_id || doc.id),
      email: data.email !== undefined ? (data.email as string | null) : null,
      name: data.name !== undefined ? (data.name as string | null) : null,
      display_name: data.display_name !== undefined ? (data.display_name as string | null) : null,
      has_paid_access: Boolean(data.has_paid_access),
      plan: data.plan !== undefined ? (data.plan as string | null) : null,
      plan_status: data.plan_status !== undefined ? (data.plan_status as string | null) : null,
      telegram_chat_id: data.telegram_chat_id !== undefined ? (data.telegram_chat_id as string | null) : null,
      telegram_enabled: data.telegram_enabled !== undefined ? Boolean(data.telegram_enabled) : null,
      telegram_connected_ts: data.telegram_connected_ts !== undefined ? Number(data.telegram_connected_ts) : null,
      scan_enabled: data.scan_enabled !== undefined ? Boolean(data.scan_enabled) : null,
      updatedAt: data.updatedAt !== undefined ? String(data.updatedAt) : undefined,
    })
  }

  // Sort client-side by updatedAt (newest first)
  users.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return bTime - aTime
  })

  // Apply limit after sorting if specified
  if (options?.limit && users.length > options.limit) {
    return users.slice(0, options.limit)
  }

  return users
}

/**
 * Ensure a user exists in Firestore with minimal identity.
 * Called during login/register events to sync Prisma → Firestore.
 */
export async function ensureUserInFirestore(userId: string, identity: Partial<UserIdentity>): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)
  const snap = await ref.get()

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    user_id: userId,
    updatedAt: now,
  }

  if (identity.email !== undefined) update.email = identity.email
  if (identity.name !== undefined) update.name = identity.name
  if (identity.display_name !== undefined) update.display_name = identity.display_name
  if (identity.has_paid_access !== undefined) update.has_paid_access = Boolean(identity.has_paid_access)
  if (identity.plan !== undefined) update.plan = identity.plan
  if (identity.plan_status !== undefined) update.plan_status = identity.plan_status

  if (!snap.exists) {
    update.createdAt = now
    // Set defaults for new users
    if (update.has_paid_access === undefined) update.has_paid_access = false
    if (update.scan_enabled === undefined) update.scan_enabled = false
    if (update.telegram_enabled === undefined) update.telegram_enabled = false
  }

  await ref.set(update, { merge: true })
}

/**
 * Delete user document from Firestore.
 * Also deletes signals subcollection.
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const db = getFirebaseAdminDb()
  const userRef = db.collection(USERS_COLLECTION).doc(userId)

  // Delete signals subcollection first
  const signalsSnap = await userRef.collection("signals").get()
  const batch = db.batch()
  for (const doc of signalsSnap.docs) {
    batch.delete(doc.ref)
  }
  await batch.commit()

  // Delete user document
  await userRef.delete()
}
