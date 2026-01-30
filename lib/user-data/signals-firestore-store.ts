/**
 * Signals Firestore Store
 *
 * Single source of truth for all trading signals.
 * Path: users/{userId}/signals/{signalId}
 *
 * Features:
 * - CRUD operations for signals
 * - Query by symbol, strategy, status, date range
 * - Real-time updates support
 * - Batch operations for scanner
 */

import { FieldValue, Firestore, Timestamp, Query, DocumentData } from "firebase-admin/firestore"

// ============================================================
// Types
// ============================================================

export interface SignalData {
  // Identity
  signal_id: string
  symbol: string
  timeframe: string
  direction: "BUY" | "SELL" | "bullish" | "bearish"

  // Price levels
  entry: number
  sl: number
  tp: number
  rr?: number

  // Strategy info
  strategy_id?: string
  strategy_name?: string
  detectors?: string[]

  // Timestamps (epoch seconds)
  created_at: number
  updated_at?: number

  // Status
  status: "pending" | "active" | "closed" | "cancelled" | "expired"
  outcome?: "win" | "loss" | "breakeven" | null

  // Optional: execution data
  fill_price?: number
  close_price?: number
  closed_at?: number
  pnl_pct?: number

  // Metadata
  source?: string // "scanner" | "manual"
  notes?: string
}

export interface SignalCreateInput {
  signal_id: string
  symbol: string
  timeframe: string
  direction: "BUY" | "SELL" | "bullish" | "bearish"
  entry: number
  sl: number
  tp: number
  rr?: number
  strategy_id?: string
  strategy_name?: string
  detectors?: string[]
  created_at?: number
  status?: SignalData["status"]
  source?: string
}

export interface SignalUpdateInput {
  status?: SignalData["status"]
  outcome?: SignalData["outcome"]
  fill_price?: number
  close_price?: number
  closed_at?: number
  pnl_pct?: number
  notes?: string
}

export interface SignalQueryOptions {
  symbol?: string
  strategy_id?: string
  status?: SignalData["status"]
  startDate?: number // epoch seconds
  endDate?: number   // epoch seconds
  limit?: number
  orderBy?: "created_at" | "updated_at"
  orderDir?: "asc" | "desc"
}

// ============================================================
// Constants
// ============================================================

const USERS_COLLECTION = "users"
const SIGNALS_SUBCOLLECTION = "signals"

// ============================================================
// Store Functions
// ============================================================

/**
 * Get a single signal by ID
 */
export async function getSignal(
  db: Firestore,
  userId: string,
  signalId: string
): Promise<SignalData | null> {
  if (!userId || !signalId) return null

  try {
    const signalRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)
      .doc(signalId)

    const snap = await signalRef.get()
    if (!snap.exists) return null

    return snap.data() as SignalData
  } catch (error: any) {
    console.error(`[signals-store] getSignal failed:`, error?.message)
    return null
  }
}

/**
 * Create a new signal
 */
export async function createSignal(
  db: Firestore,
  userId: string,
  input: SignalCreateInput
): Promise<SignalData | null> {
  if (!userId || !input.signal_id) return null

  try {
    const signalRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)
      .doc(input.signal_id)

    // Check for duplicate
    const existing = await signalRef.get()
    if (existing.exists) {
      console.log(`[signals-store] Signal ${input.signal_id} already exists`)
      return existing.data() as SignalData
    }

    // Calculate RR if not provided
    let rr = input.rr
    if (!rr && input.entry && input.sl && input.tp) {
      const risk = Math.abs(input.entry - input.sl)
      const reward = Math.abs(input.tp - input.entry)
      rr = risk > 0 ? reward / risk : 0
    }

    const now = Math.floor(Date.now() / 1000)

    const signalData: SignalData = {
      signal_id: input.signal_id,
      symbol: input.symbol,
      timeframe: input.timeframe,
      direction: input.direction,
      entry: input.entry,
      sl: input.sl,
      tp: input.tp,
      rr: rr ? Math.round(rr * 100) / 100 : undefined,
      strategy_id: input.strategy_id,
      strategy_name: input.strategy_name,
      detectors: input.detectors || [],
      created_at: input.created_at || now,
      updated_at: now,
      status: input.status || "pending",
      source: input.source || "scanner",
    }

    await signalRef.set(signalData)

    console.log(`[signals-store] Created signal ${input.signal_id} for user ${userId.slice(0, 8)}...`)

    return signalData
  } catch (error: any) {
    console.error(`[signals-store] createSignal failed:`, error?.message)
    return null
  }
}

/**
 * Update an existing signal
 */
export async function updateSignal(
  db: Firestore,
  userId: string,
  signalId: string,
  input: SignalUpdateInput
): Promise<SignalData | null> {
  if (!userId || !signalId) return null

  try {
    const signalRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)
      .doc(signalId)

    const snap = await signalRef.get()
    if (!snap.exists) {
      console.warn(`[signals-store] Signal ${signalId} not found`)
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    const updateData = {
      ...input,
      updated_at: now,
    }

    await signalRef.update(updateData)

    const updated = await signalRef.get()
    return updated.data() as SignalData
  } catch (error: any) {
    console.error(`[signals-store] updateSignal failed:`, error?.message)
    return null
  }
}

/**
 * Delete a signal
 */
export async function deleteSignal(
  db: Firestore,
  userId: string,
  signalId: string
): Promise<boolean> {
  if (!userId || !signalId) return false

  try {
    const signalRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)
      .doc(signalId)

    await signalRef.delete()
    console.log(`[signals-store] Deleted signal ${signalId}`)
    return true
  } catch (error: any) {
    console.error(`[signals-store] deleteSignal failed:`, error?.message)
    return false
  }
}

/**
 * Query signals with filters
 */
export async function querySignals(
  db: Firestore,
  userId: string,
  options: SignalQueryOptions = {}
): Promise<SignalData[]> {
  if (!userId) return []

  try {
    let query: Query<DocumentData> = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)

    // Apply filters
    if (options.symbol) {
      query = query.where("symbol", "==", options.symbol)
    }

    if (options.strategy_id) {
      query = query.where("strategy_id", "==", options.strategy_id)
    }

    if (options.status) {
      query = query.where("status", "==", options.status)
    }

    if (options.startDate) {
      query = query.where("created_at", ">=", options.startDate)
    }

    if (options.endDate) {
      query = query.where("created_at", "<=", options.endDate)
    }

    // Order
    const orderField = options.orderBy || "created_at"
    const orderDir = options.orderDir || "desc"
    query = query.orderBy(orderField, orderDir)

    // Limit
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const snap = await query.get()
    return snap.docs.map(doc => doc.data() as SignalData)
  } catch (error: any) {
    console.error(`[signals-store] querySignals failed:`, error?.message)

    // Fallback: simple query without complex filters
    try {
      const snap = await db
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(SIGNALS_SUBCOLLECTION)
        .orderBy("created_at", "desc")
        .limit(options.limit || 100)
        .get()

      let results = snap.docs.map(doc => doc.data() as SignalData)

      // Apply filters in memory
      if (options.symbol) {
        results = results.filter(s => s.symbol === options.symbol)
      }
      if (options.strategy_id) {
        results = results.filter(s => s.strategy_id === options.strategy_id)
      }
      if (options.status) {
        results = results.filter(s => s.status === options.status)
      }

      return results
    } catch {
      return []
    }
  }
}

/**
 * Get recent signals (for dashboard)
 */
export async function getRecentSignals(
  db: Firestore,
  userId: string,
  limit: number = 50
): Promise<SignalData[]> {
  return querySignals(db, userId, { limit, orderBy: "created_at", orderDir: "desc" })
}

/**
 * Batch create signals (for scanner bulk insert)
 */
export async function batchCreateSignals(
  db: Firestore,
  userId: string,
  signals: SignalCreateInput[]
): Promise<{ created: number; skipped: number }> {
  if (!userId || signals.length === 0) {
    return { created: 0, skipped: 0 }
  }

  let created = 0
  let skipped = 0

  // Firestore batch limit is 500
  const batchSize = 400
  const batches: SignalCreateInput[][] = []

  for (let i = 0; i < signals.length; i += batchSize) {
    batches.push(signals.slice(i, i + batchSize))
  }

  for (const batchSignals of batches) {
    const batch = db.batch()

    for (const input of batchSignals) {
      const signalRef = db
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(SIGNALS_SUBCOLLECTION)
        .doc(input.signal_id)

      // Calculate RR
      let rr = input.rr
      if (!rr && input.entry && input.sl && input.tp) {
        const risk = Math.abs(input.entry - input.sl)
        const reward = Math.abs(input.tp - input.entry)
        rr = risk > 0 ? reward / risk : 0
      }

      const now = Math.floor(Date.now() / 1000)

      const signalData: SignalData = {
        signal_id: input.signal_id,
        symbol: input.symbol,
        timeframe: input.timeframe,
        direction: input.direction,
        entry: input.entry,
        sl: input.sl,
        tp: input.tp,
        rr: rr ? Math.round(rr * 100) / 100 : undefined,
        strategy_id: input.strategy_id,
        strategy_name: input.strategy_name,
        detectors: input.detectors || [],
        created_at: input.created_at || now,
        updated_at: now,
        status: input.status || "pending",
        source: input.source || "scanner",
      }

      batch.set(signalRef, signalData, { merge: true })
      created++
    }

    await batch.commit()
  }

  console.log(`[signals-store] Batch created ${created} signals for user ${userId.slice(0, 8)}...`)

  return { created, skipped }
}

/**
 * Check if signal exists (for deduplication)
 */
export async function signalExists(
  db: Firestore,
  userId: string,
  signalId: string
): Promise<boolean> {
  if (!userId || !signalId) return false

  try {
    const signalRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)
      .doc(signalId)

    const snap = await signalRef.get()
    return snap.exists
  } catch {
    return false
  }
}

/**
 * Count signals (for stats)
 */
export async function countSignals(
  db: Firestore,
  userId: string,
  options: { status?: SignalData["status"]; symbol?: string } = {}
): Promise<number> {
  if (!userId) return 0

  try {
    let query: Query<DocumentData> = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SIGNALS_SUBCOLLECTION)

    if (options.status) {
      query = query.where("status", "==", options.status)
    }
    if (options.symbol) {
      query = query.where("symbol", "==", options.symbol)
    }

    const snap = await query.count().get()
    return snap.data().count
  } catch {
    return 0
  }
}
