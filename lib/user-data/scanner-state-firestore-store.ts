/**
 * Scanner State Firestore Store
 *
 * Tracks signal cooldown state to prevent duplicate signals.
 * Path: users/{userId}/scanner_state/{stateKey}
 *
 * State key format: {symbol}_{strategy_id}_{direction}
 * Example: XAUUSD_starter_EDGE_1_BUY
 *
 * Features:
 * - Check cooldown before generating signal
 * - Update last signal time after generation
 * - Automatic cleanup of old state entries
 */

import { FieldValue, Firestore } from "firebase-admin/firestore"

// ============================================================
// Types
// ============================================================

export interface ScannerStateEntry {
  key: string              // e.g., "XAUUSD_starter_EDGE_1_BUY"
  symbol: string
  strategy_id: string
  direction: "BUY" | "SELL"
  last_signal_at: number   // epoch seconds
  signal_id?: string       // last signal ID
  updated_at: number       // epoch seconds
}

export interface CooldownCheckResult {
  allowed: boolean
  reason?: string
  lastSignalAt?: number
  cooldownRemaining?: number // seconds
}

// ============================================================
// Constants
// ============================================================

const USERS_COLLECTION = "users"
const STATE_SUBCOLLECTION = "scanner_state"

// Default cooldown if not specified (1 hour)
const DEFAULT_COOLDOWN_SECONDS = 3600

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate state key from components
 */
export function makeStateKey(
  symbol: string,
  strategyId: string,
  direction: "BUY" | "SELL"
): string {
  return `${symbol}_${strategyId}_${direction}`
}

/**
 * Parse state key back to components
 */
export function parseStateKey(key: string): {
  symbol: string
  strategy_id: string
  direction: "BUY" | "SELL"
} | null {
  const parts = key.split("_")
  if (parts.length < 3) return null

  // Direction is always last
  const direction = parts.pop() as "BUY" | "SELL"
  // Symbol is first
  const symbol = parts.shift()!
  // Strategy ID is everything in between
  const strategy_id = parts.join("_")

  return { symbol, strategy_id, direction }
}

// ============================================================
// Store Functions
// ============================================================

/**
 * Get scanner state entry
 */
export async function getState(
  db: Firestore,
  userId: string,
  stateKey: string
): Promise<ScannerStateEntry | null> {
  if (!userId || !stateKey) return null

  try {
    const stateRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)
      .doc(stateKey)

    const snap = await stateRef.get()
    if (!snap.exists) return null

    return snap.data() as ScannerStateEntry
  } catch (error: any) {
    console.error(`[scanner-state] getState failed:`, error?.message)
    return null
  }
}

/**
 * Check if cooldown allows a new signal
 */
export async function checkCooldown(
  db: Firestore,
  userId: string,
  symbol: string,
  strategyId: string,
  direction: "BUY" | "SELL",
  cooldownMinutes: number = 60
): Promise<CooldownCheckResult> {
  if (!userId) {
    return { allowed: false, reason: "INVALID_USER" }
  }

  const stateKey = makeStateKey(symbol, strategyId, direction)
  const cooldownSeconds = cooldownMinutes * 60

  try {
    const state = await getState(db, userId, stateKey)

    // No previous state = allowed
    if (!state) {
      return { allowed: true }
    }

    const now = Math.floor(Date.now() / 1000)
    const elapsed = now - state.last_signal_at
    const remaining = cooldownSeconds - elapsed

    if (remaining > 0) {
      return {
        allowed: false,
        reason: "COOLDOWN_ACTIVE",
        lastSignalAt: state.last_signal_at,
        cooldownRemaining: remaining,
      }
    }

    return { allowed: true, lastSignalAt: state.last_signal_at }
  } catch (error: any) {
    console.error(`[scanner-state] checkCooldown failed:`, error?.message)
    // Allow on error to not block signals
    return { allowed: true }
  }
}

/**
 * Update state after generating a signal
 */
export async function updateState(
  db: Firestore,
  userId: string,
  symbol: string,
  strategyId: string,
  direction: "BUY" | "SELL",
  signalId?: string
): Promise<boolean> {
  if (!userId) return false

  const stateKey = makeStateKey(symbol, strategyId, direction)
  const now = Math.floor(Date.now() / 1000)

  try {
    const stateRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)
      .doc(stateKey)

    const stateData: ScannerStateEntry = {
      key: stateKey,
      symbol,
      strategy_id: strategyId,
      direction,
      last_signal_at: now,
      signal_id: signalId,
      updated_at: now,
    }

    await stateRef.set(stateData)

    console.log(`[scanner-state] Updated ${stateKey} for user ${userId.slice(0, 8)}...`)
    return true
  } catch (error: any) {
    console.error(`[scanner-state] updateState failed:`, error?.message)
    return false
  }
}

/**
 * Delete a state entry (for reset)
 */
export async function deleteState(
  db: Firestore,
  userId: string,
  stateKey: string
): Promise<boolean> {
  if (!userId || !stateKey) return false

  try {
    const stateRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)
      .doc(stateKey)

    await stateRef.delete()
    return true
  } catch (error: any) {
    console.error(`[scanner-state] deleteState failed:`, error?.message)
    return false
  }
}

/**
 * Clear all state for a user (full reset)
 */
export async function clearAllState(
  db: Firestore,
  userId: string
): Promise<number> {
  if (!userId) return 0

  try {
    const stateCollection = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)

    const snap = await stateCollection.get()

    if (snap.empty) return 0

    const batch = db.batch()
    snap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    console.log(`[scanner-state] Cleared ${snap.size} state entries for user ${userId.slice(0, 8)}...`)
    return snap.size
  } catch (error: any) {
    console.error(`[scanner-state] clearAllState failed:`, error?.message)
    return 0
  }
}

/**
 * Get all state entries for a user
 */
export async function getAllState(
  db: Firestore,
  userId: string
): Promise<ScannerStateEntry[]> {
  if (!userId) return []

  try {
    const stateCollection = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)

    const snap = await stateCollection.get()
    return snap.docs.map(doc => doc.data() as ScannerStateEntry)
  } catch (error: any) {
    console.error(`[scanner-state] getAllState failed:`, error?.message)
    return []
  }
}

/**
 * Cleanup old state entries (older than 24 hours)
 */
export async function cleanupOldState(
  db: Firestore,
  userId: string,
  maxAgeHours: number = 24
): Promise<number> {
  if (!userId) return 0

  try {
    const cutoff = Math.floor(Date.now() / 1000) - (maxAgeHours * 3600)

    const stateCollection = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(STATE_SUBCOLLECTION)
      .where("updated_at", "<", cutoff)

    const snap = await stateCollection.get()

    if (snap.empty) return 0

    const batch = db.batch()
    snap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    console.log(`[scanner-state] Cleaned up ${snap.size} old entries for user ${userId.slice(0, 8)}...`)
    return snap.size
  } catch (error: any) {
    console.error(`[scanner-state] cleanupOldState failed:`, error?.message)
    return 0
  }
}

/**
 * Batch check cooldowns (for multiple symbol/strategy combos)
 */
export async function batchCheckCooldowns(
  db: Firestore,
  userId: string,
  checks: Array<{
    symbol: string
    strategy_id: string
    direction: "BUY" | "SELL"
    cooldownMinutes: number
  }>
): Promise<Map<string, CooldownCheckResult>> {
  const results = new Map<string, CooldownCheckResult>()

  if (!userId || checks.length === 0) {
    return results
  }

  // Get all state entries for this user
  const allState = await getAllState(db, userId)
  const stateMap = new Map(allState.map(s => [s.key, s]))

  const now = Math.floor(Date.now() / 1000)

  for (const check of checks) {
    const stateKey = makeStateKey(check.symbol, check.strategy_id, check.direction)
    const cooldownSeconds = check.cooldownMinutes * 60

    const state = stateMap.get(stateKey)

    if (!state) {
      results.set(stateKey, { allowed: true })
      continue
    }

    const elapsed = now - state.last_signal_at
    const remaining = cooldownSeconds - elapsed

    if (remaining > 0) {
      results.set(stateKey, {
        allowed: false,
        reason: "COOLDOWN_ACTIVE",
        lastSignalAt: state.last_signal_at,
        cooldownRemaining: remaining,
      })
    } else {
      results.set(stateKey, { allowed: true, lastSignalAt: state.last_signal_at })
    }
  }

  return results
}
