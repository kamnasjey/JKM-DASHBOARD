/**
 * Starter Strategies - Auto-seed for new users
 * 
 * Every new user gets 3 default "EDGE Starter" strategies.
 * These use canonical detector IDs from lib/detectors/catalog.ts.
 * 
 * SAFETY:
 * - Seeded ONCE per user (marker: starterSeeded=true)
 * - Uses deterministic doc IDs to prevent duplicates
 * - User CAN delete starter strategies
 * - Deleted starters are NOT re-created (once seeded, never again)
 */

import { FieldValue, Firestore } from "firebase-admin/firestore"
import { normalizeDetectorList } from "@/lib/detectors/normalize"

// ============================================================
// Constants
// ============================================================

const USERS_COLLECTION = "users"
const STRATEGIES_SUBCOLLECTION = "strategies"

/** Current starter seed version - increment to reseed all users */
export const STARTER_SEED_VERSION = "v4"

const DISABLE_STARTER_STRATEGIES = ["1", "true", "yes"].includes(
  String(process.env.DISABLE_STARTER_STRATEGIES || "").trim().toLowerCase(),
)

// ============================================================
// Starter Strategy Templates
// ============================================================

/**
 * 3 Edge Starter Strategies
 * 
 * Detector IDs are from lib/detectors/catalog.ts (canonical UPPERCASE_SNAKE_CASE):
 * 
 * GATES (3): GATE_REGIME, GATE_VOLATILITY, GATE_DRIFT_SENTINEL
 * TRIGGERS (15): BOS, FVG, OB, CHOCH, EQ_BREAK, SWEEP, IMBALANCE, SFP, 
 *                BREAK_RETEST, COMPRESSION_EXPANSION, MOMENTUM_CONTINUATION,
 *                MEAN_REVERSION_SNAPBACK, SR_BOUNCE, SR_BREAK_CLOSE, TRIANGLE_BREAKOUT_CLOSE
 * CONFLUENCE (13): DOJI, DOUBLE_TOP_BOTTOM, ENGULF_AT_LEVEL, FAKEOUT_TRAP,
 *                  FIBO_EXTENSION, FIBO_RETRACE_CONFLUENCE, FLAG_PENNANT,
 *                  HEAD_SHOULDERS, PINBAR_AT_LEVEL, PRICE_MOMENTUM_WEAKENING,
 *                  RECTANGLE_RANGE_EDGE, SR_ROLE_REVERSAL, TREND_FIBO
 */

export interface StarterStrategyTemplate {
  /** Deterministic doc ID: starter_EDGE_1, starter_EDGE_2, starter_EDGE_3 */
  id: string
  /** Strategy name (English) */
  name: string
  /** Short description */
  description: string
  /** All detectors (flattened) - CANONICAL IDs only */
  detectors: string[]
  /** Gate detectors */
  gates: string[]
  /** Trigger detectors */
  triggers: string[]
  /** Confluence/confirm detectors */
  confluence: string[]
  /** Unique starter key */
  starterKey: string
  /** Risk defaults */
  risk: {
    minRR: number
    maxRiskPercent: number
    minConfirmHits: number
  }
  /** Cooldown in minutes between same signals */
  cooldownMinutes: number
}

export const STARTER_STRATEGIES_V1: StarterStrategyTemplate[] = [
  {
    id: "starter_EDGE_1",
    name: "EDGE #1 - Trend Continuation",
    description: "BOS + FVG trend follow strategy. Best for clear trending markets.",
    detectors: ["GATE_REGIME", "BOS", "FVG", "FLAG_PENNANT", "TREND_FIBO"],
    gates: ["GATE_REGIME"],
    triggers: ["BOS", "FVG"],
    confluence: ["FLAG_PENNANT", "TREND_FIBO"],
    starterKey: "edge_continuation_v1",
    risk: {
      minRR: 3.0,
      maxRiskPercent: 1.0,
      minConfirmHits: 2,
    },
    cooldownMinutes: 60, // 1 hour cooldown to prevent duplicate signals
  },
  {
    id: "starter_EDGE_2",
    name: "EDGE #2 - Reversal Trap",
    description: "SWEEP + SFP liquidity grab reversal. Catches stop hunts.",
    detectors: ["GATE_REGIME", "GATE_VOLATILITY", "SWEEP", "SFP", "ENGULF_AT_LEVEL", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME", "GATE_VOLATILITY"],
    triggers: ["SWEEP", "SFP"],
    confluence: ["ENGULF_AT_LEVEL", "PINBAR_AT_LEVEL"],
    starterKey: "edge_reversal_v1",
    risk: {
      minRR: 3.0,
      maxRiskPercent: 1.0,
      minConfirmHits: 2,
    },
    cooldownMinutes: 60, // 1 hour cooldown to prevent duplicate signals
  },
  {
    id: "starter_EDGE_3",
    name: "EDGE #3 - Order Block",
    description: "OB + Break Retest institutional flow. Smart money entry.",
    detectors: ["GATE_REGIME", "GATE_DRIFT_SENTINEL", "OB", "BREAKOUT_RETEST_ENTRY", "SR_ROLE_REVERSAL", "FIBO_RETRACE_CONFLUENCE"],
    gates: ["GATE_REGIME", "GATE_DRIFT_SENTINEL"],
    triggers: ["OB", "BREAKOUT_RETEST_ENTRY"],
    confluence: ["SR_ROLE_REVERSAL", "FIBO_RETRACE_CONFLUENCE"],
    starterKey: "edge_institutional_v1",
    risk: {
      minRR: 3.0,
      maxRiskPercent: 1.0,
      minConfirmHits: 2,
    },
    cooldownMinutes: 60, // 1 hour cooldown to prevent duplicate signals
  },
  // ============================================================
  // TESTED STRATEGIES (90-day backtest verified, 50%+ WR, positive R)
  // ============================================================
  {
    id: "starter_TESTED_1",
    name: "TESTED #1 - EURGBP Mean Reversion",
    description: "15m Mean Reversion on EURGBP. 69.4% WR, +14.9R (90-day backtest).",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    triggers: ["MEAN_REVERSION_SNAPBACK"],
    confluence: ["PINBAR_AT_LEVEL"],
    starterKey: "tested_eurgbp_meanrev_v1",
    risk: {
      minRR: 2.5,
      maxRiskPercent: 1.0,
      minConfirmHits: 1,
    },
    cooldownMinutes: 30,
  },
  {
    id: "starter_TESTED_2",
    name: "TESTED #2 - EURJPY Mean Reversion",
    description: "15m Mean Reversion on EURJPY. 56.9% WR, +21.6R (90-day backtest).",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    triggers: ["MEAN_REVERSION_SNAPBACK"],
    confluence: ["PINBAR_AT_LEVEL"],
    starterKey: "tested_eurjpy_meanrev_v1",
    risk: {
      minRR: 2.5,
      maxRiskPercent: 1.0,
      minConfirmHits: 1,
    },
    cooldownMinutes: 30,
  },
  {
    id: "starter_TESTED_3",
    name: "TESTED #3 - BTCUSD Mean Reversion",
    description: "1h Mean Reversion on BTCUSD. 55.6% WR, +11.7R (90-day backtest).",
    detectors: ["GATE_REGIME", "MEAN_REVERSION_SNAPBACK", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    triggers: ["MEAN_REVERSION_SNAPBACK"],
    confluence: ["PINBAR_AT_LEVEL"],
    starterKey: "tested_btcusd_meanrev_v1",
    risk: {
      minRR: 2.5,
      maxRiskPercent: 1.0,
      minConfirmHits: 1,
    },
    cooldownMinutes: 120,
  },
  {
    id: "starter_TESTED_4",
    name: "TESTED #4 - NZDUSD EQ Break",
    description: "1h EQ Break on NZDUSD. 58.8% WR, +11.5R (90-day backtest).",
    detectors: ["GATE_REGIME", "EQ_BREAK", "BOS"],
    gates: ["GATE_REGIME"],
    triggers: ["EQ_BREAK"],
    confluence: ["BOS"],
    starterKey: "tested_nzdusd_eqbreak_v1",
    risk: {
      minRR: 2.5,
      maxRiskPercent: 1.0,
      minConfirmHits: 1,
    },
    cooldownMinutes: 120,
  },
]

// ============================================================
// Seed Function
// ============================================================

export interface SeedResult {
  seeded: boolean
  reason?: string
  strategiesCreated?: number
}

/**
 * Seed starter strategies for a user.
 * 
 * Uses Firestore transaction to:
 * 1. Check if already seeded (starterSeeded=true and version matches)
 * 2. If not seeded: create 3 starter strategy docs with deterministic IDs
 * 3. Set marker: starterSeeded=true, starterSeedVersion="v1"
 * 
 * SAFETY:
 * - Idempotent: safe to call multiple times
 * - Uses deterministic doc IDs: starter_EDGE_1, starter_EDGE_2, starter_EDGE_3
 * - Once seeded, never seeds again (even if user deletes strategies)
 * 
 * @param db Firestore database instance
 * @param userId User ID
 * @returns SeedResult with status
 */
export async function seedStarterStrategiesForUser(
  db: Firestore,
  userId: string
): Promise<SeedResult> {
  if (DISABLE_STARTER_STRATEGIES) {
    return { seeded: false, reason: "DISABLED" }
  }
  if (STARTER_STRATEGIES_V1.length === 0) {
    return { seeded: false, reason: "NO_TEMPLATES" }
  }
  if (!userId) {
    return { seeded: false, reason: "INVALID_USER_ID" }
  }

  const userRef = db.collection(USERS_COLLECTION).doc(userId)
  const strategiesRef = userRef.collection(STRATEGIES_SUBCOLLECTION)

  try {
    const result = await db.runTransaction(async (tx) => {
      // 1. Read user doc
      const userSnap = await tx.get(userRef)
      const userData = userSnap.data() || {}

      // 2. Check if already seeded with current version
      if (
        userData.starterSeeded === true &&
        userData.starterSeedVersion === STARTER_SEED_VERSION
      ) {
        return { seeded: false, reason: "ALREADY_SEEDED" }
      }

      // 3. Get list of deleted starter IDs (never recreate these)
      const deletedIds: string[] = Array.isArray(userData.starterDeletedIds)
        ? userData.starterDeletedIds
        : []

      // 4. Create starter strategies
      const now = FieldValue.serverTimestamp()
      let created = 0

      for (const template of STARTER_STRATEGIES_V1) {
        // Skip if user previously deleted this starter
        if (deletedIds.includes(template.id)) {
          console.log(
            `[starter-strategies] Skipping ${template.id} - user deleted previously`
          )
          continue
        }

        const stratRef = strategiesRef.doc(template.id)
        
        // Check if doc already exists (in case of partial seed)
        const stratSnap = await tx.get(stratRef)
        if (stratSnap.exists) {
          continue // Skip if already exists
        }

        // Normalize detectors to ensure canonical IDs
        const normalizedDetectors = normalizeDetectorList(template.detectors)

        const strategyData = {
          // Identity
          name: template.name,
          description: template.description,

          // Detectors - canonical IDs only
          detectors: normalizedDetectors,
          gates: template.gates,
          triggers: template.triggers,
          confluence: template.confluence,
          confirms: [], // Legacy field compatibility

          // Risk config
          risk: template.risk,

          // Cooldown to prevent duplicate signals (snake_case for backend compatibility)
          cooldown_minutes: template.cooldownMinutes || 60,

          // Metadata
          enabled: true,
          isStarter: true,
          starterKey: template.starterKey,
          version: 1,

          // Timestamps
          createdAt: now,
          updatedAt: now,
        }

        tx.set(stratRef, strategyData)
        created++
      }

      // 5. Update user doc with seed marker
      tx.set(
        userRef,
        {
          starterSeeded: true,
          starterSeedVersion: STARTER_SEED_VERSION,
          starterSeededAt: now,
        },
        { merge: true }
      )

      return { seeded: true, strategiesCreated: created }
    })

    console.log(
      `[starter-strategies] User ${userId.slice(0, 8)}... seeded=${result.seeded} created=${result.strategiesCreated || 0}`
    )

    return result
  } catch (error: any) {
    console.error(
      `[starter-strategies] Seed failed for user ${userId.slice(0, 8)}...:`,
      error?.message || error
    )
    return { seeded: false, reason: `ERROR: ${error?.message || "Unknown"}` }
  }
}

/**
 * Check if user has been seeded with starter strategies.
 */
export async function hasStarterStrategiesSeeded(
  db: Firestore,
  userId: string
): Promise<boolean> {
  if (!userId) return false

  try {
    const userRef = db.collection(USERS_COLLECTION).doc(userId)
    const snap = await userRef.get()
    const data = snap.data()

    return (
      data?.starterSeeded === true &&
      data?.starterSeedVersion === STARTER_SEED_VERSION
    )
  } catch {
    return false
  }
}

// ============================================================
// Starter Strategy IDs (exported for UI badge detection)
// ============================================================

/** Deterministic starter strategy IDs */
export const STARTER_STRATEGY_IDS = STARTER_STRATEGIES_V1.map((s) => s.id)

/**
 * Check if a strategy ID is a starter strategy
 */
export function isStarterStrategy(strategyId: string): boolean {
  return strategyId.startsWith("starter_")
}

// ============================================================
// Mark Starter as Deleted (prevents resurrection)
// ============================================================

/**
 * Mark a starter strategy as deleted.
 * 
 * When user deletes a starter, we add its ID to starterDeletedIds array.
 * This prevents the strategy from being re-created on next login.
 * 
 * @param db Firestore database instance
 * @param userId User ID
 * @param strategyId Strategy ID being deleted
 */
export async function markStarterDeleted(
  db: Firestore,
  userId: string,
  strategyId: string
): Promise<void> {
  if (!userId || !strategyId) return
  if (!isStarterStrategy(strategyId)) return // Only track starters

  try {
    const userRef = db.collection(USERS_COLLECTION).doc(userId)
    await userRef.set(
      {
        starterDeletedIds: FieldValue.arrayUnion(strategyId),
      },
      { merge: true }
    )
    console.log(
      `[starter-strategies] Marked starter ${strategyId} as deleted for user ${userId.slice(0, 8)}...`
    )
  } catch (error: any) {
    console.error(
      `[starter-strategies] Failed to mark starter deleted:`,
      error?.message || error
    )
    // Non-fatal: don't throw
  }
}
