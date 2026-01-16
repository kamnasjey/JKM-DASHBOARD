import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { StrategyDoc, CreateStrategyInput, UpdateStrategyInput } from "@/lib/schemas/strategy"

/**
 * Strategy Firestore Store
 * 
 * Data model: users/{uid}/strategies/{strategyId}
 * 
 * Uses Firebase Admin SDK (server-side only).
 * No client Firestore write permissions needed.
 */

const USERS_COLLECTION = "users"
const STRATEGIES_SUBCOLLECTION = "strategies"

/** Maximum strategies per user */
export const MAX_STRATEGIES_PER_USER = 30

/** Default pagination limit */
export const DEFAULT_LIMIT = 50

/**
 * Get strategies collection reference for a user
 */
function getStrategiesRef(userId: string) {
  const db = getFirebaseAdminDb()
  return db.collection(USERS_COLLECTION).doc(userId).collection(STRATEGIES_SUBCOLLECTION)
}

/**
 * List strategies for a user with pagination
 */
export async function listStrategies(
  userId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ strategies: StrategyDoc[]; nextCursor: string | null }> {
  const limit = Math.min(options.limit || DEFAULT_LIMIT, 100)
  const ref = getStrategiesRef(userId)
  
  let query = ref.orderBy("updatedAt", "desc").limit(limit + 1)
  
  if (options.cursor) {
    const cursorDoc = await ref.doc(options.cursor).get()
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc)
    }
  }
  
  const snapshot = await query.get()
  const docs = snapshot.docs.slice(0, limit)
  const hasMore = snapshot.docs.length > limit
  
  const strategies: StrategyDoc[] = docs.map(doc => ({
    id: doc.id,
    ...normalizeStrategy(doc.data()),
  }))
  
  return {
    strategies,
    nextCursor: hasMore ? docs[docs.length - 1]?.id || null : null,
  }
}

/**
 * Get a single strategy by ID
 */
export async function getStrategy(userId: string, strategyId: string): Promise<StrategyDoc | null> {
  const ref = getStrategiesRef(userId).doc(strategyId)
  const doc = await ref.get()
  
  if (!doc.exists) return null
  
  return {
    id: doc.id,
    ...normalizeStrategy(doc.data()),
  }
}

/**
 * Create a new strategy
 */
export async function createStrategy(
  userId: string,
  input: CreateStrategyInput
): Promise<StrategyDoc> {
  const ref = getStrategiesRef(userId)
  
  // Check limit
  const countSnap = await ref.count().get()
  if (countSnap.data().count >= MAX_STRATEGIES_PER_USER) {
    throw new Error(`Maximum ${MAX_STRATEGIES_PER_USER} strategies allowed per user`)
  }
  
  // Generate ID
  const newRef = ref.doc()
  const now = FieldValue.serverTimestamp()
  
  const data = stripUndefinedDeep({
    name: input.name,
    description: input.description || null,
    enabled: input.enabled ?? true,
    detectors: input.detectors,
    symbols: input.symbols || null,
    timeframe: input.timeframe || null,
    config: input.config || {},
    version: 1,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
  })
  
  await newRef.set(data, { merge: true })
  
  // Fetch back to get actual timestamps
  const created = await newRef.get()
  return {
    id: newRef.id,
    ...normalizeStrategy(created.data()),
  }
}

/**
 * Update an existing strategy
 */
export async function updateStrategy(
  userId: string,
  strategyId: string,
  input: UpdateStrategyInput
): Promise<StrategyDoc> {
  const ref = getStrategiesRef(userId).doc(strategyId)
  const doc = await ref.get()
  
  if (!doc.exists) {
    throw new Error("Strategy not found")
  }
  
  const updateData: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  }
  
  // Only update provided fields
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.enabled !== undefined) updateData.enabled = input.enabled
  if (input.detectors !== undefined) updateData.detectors = input.detectors
  if (input.symbols !== undefined) updateData.symbols = input.symbols
  if (input.timeframe !== undefined) updateData.timeframe = input.timeframe
  if (input.config !== undefined) updateData.config = input.config
  
  // Increment version
  updateData.version = FieldValue.increment(1)
  
  await ref.update(stripUndefinedDeep(updateData))
  
  // Fetch back
  const updated = await ref.get()
  return {
    id: ref.id,
    ...normalizeStrategy(updated.data()),
  }
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(userId: string, strategyId: string): Promise<void> {
  const ref = getStrategiesRef(userId).doc(strategyId)
  const doc = await ref.get()
  
  if (!doc.exists) {
    throw new Error("Strategy not found")
  }
  
  await ref.delete()
}

/**
 * Get count of user's strategies
 */
export async function getStrategyCount(userId: string): Promise<number> {
  const ref = getStrategiesRef(userId)
  const countSnap = await ref.count().get()
  return countSnap.data().count
}

/**
 * Normalize Firestore data to StrategyDoc
 */
function normalizeStrategy(data: any): Omit<StrategyDoc, "id"> {
  return {
    name: String(data?.name || ""),
    description: data?.description || null,
    enabled: Boolean(data?.enabled),
    detectors: Array.isArray(data?.detectors) ? data.detectors.map(String) : [],
    symbols: Array.isArray(data?.symbols) ? data.symbols.map(String) : null,
    timeframe: data?.timeframe || null,
    config: typeof data?.config === "object" ? data.config : {},
    version: typeof data?.version === "number" ? data.version : 1,
    createdAt: toISOString(data?.createdAt),
    updatedAt: toISOString(data?.updatedAt),
    lastRunAt: data?.lastRunAt ? toISOString(data.lastRunAt) : null,
  }
}

/**
 * Convert Firestore timestamp to ISO string
 */
function toISOString(ts: any): string {
  if (!ts) return new Date().toISOString()
  if (typeof ts === "string") return ts
  if (ts.toDate && typeof ts.toDate === "function") {
    return ts.toDate().toISOString()
  }
  if (ts instanceof Date) return ts.toISOString()
  return new Date().toISOString()
}
