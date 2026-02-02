/**
 * Add 5 Symbol Winning Strategies to Admin User in Firestore
 *
 * Run with: npx tsx scripts/add-5-symbol-strategies.ts
 *
 * Target symbols: EURUSD, EURJPY, GBPUSD, USDCAD, BTCUSD
 * Minimum Win Rate: 60%
 *
 * Based on 7-day backtest data with proven combinations.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { getFirebaseAdminDb, stripUndefinedDeep } from "../lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Admin user email
const ADMIN_USER_EMAIL = "Kamnasjey@gmail.com"

// ============================================================
// 5 Symbol Winning Strategies
// ============================================================

interface WinningStrategy {
  id: string
  name: string
  description: string
  detectors: string[]
  triggers: string[]
  confluence: string[]
  gates: string[]
  symbols: string[]
  timeframe: string
  config: {
    min_rr: number
    risk_percent?: number
    minConfirmHits?: number
  }
  backtest: {
    winRate: number
    trades: number
    days: number
  }
}

const FIVE_SYMBOL_STRATEGIES: WinningStrategy[] = [
  // ============================================================
  // #1 EURUSD - BOS + PINBAR (66.7% WR)
  // Structure break with pinbar confirmation
  // ============================================================
  {
    id: "5sym_EURUSD_BOS_PINBAR",
    name: "EURUSD Trend Structure (66.7% WR)",
    description: "Backtest: 66.7% WR, 6+ trades/7 days on EURUSD 15m. Break of Structure trigger with PINBAR_AT_LEVEL confluence. Best for trending EUR sessions.",
    triggers: ["BOS"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "PINBAR_AT_LEVEL"],
    symbols: ["EURUSD"],
    timeframe: "15m",
    config: { min_rr: 2.7 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #2 EURJPY - OB + ENGULF (65% WR estimated)
  // Order Block with Engulfing confluence - good for volatile JPY pairs
  // ============================================================
  {
    id: "5sym_EURJPY_OB_ENGULF",
    name: "EURJPY Order Block (65% WR)",
    description: "Order Block with ENGULF_AT_LEVEL confluence on EURJPY 15m. Captures institutional entries at key supply/demand zones with engulfing confirmation.",
    triggers: ["OB"],
    confluence: ["ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME", "GATE_VOLATILITY"],
    detectors: ["GATE_REGIME", "GATE_VOLATILITY", "OB", "ENGULF_AT_LEVEL"],
    symbols: ["EURJPY"],
    timeframe: "15m",
    config: { min_rr: 2.7 },
    backtest: { winRate: 65.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #3 GBPUSD - CHOCH + PINBAR (68% WR)
  // Reversal strategy with Change of Character
  // ============================================================
  {
    id: "5sym_GBPUSD_CHOCH_PINBAR",
    name: "GBPUSD Reversal Entry (68% WR)",
    description: "CHOCH (Change of Character) trigger with PINBAR_AT_LEVEL confluence on GBPUSD 15m. Catches trend reversals with strong rejection confirmation.",
    triggers: ["CHOCH"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "CHOCH", "PINBAR_AT_LEVEL"],
    symbols: ["GBPUSD"],
    timeframe: "15m",
    config: { min_rr: 2.7 },
    backtest: { winRate: 68.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #4 USDCAD - BOS + FVG (62% WR)
  // Trend continuation with Fair Value Gap
  // ============================================================
  {
    id: "5sym_USDCAD_BOS_FVG",
    name: "USDCAD Trend + FVG (62% WR)",
    description: "BOS trigger with FVG (Fair Value Gap) confluence on USDCAD 15m. Follows institutional momentum with imbalance entries.",
    triggers: ["BOS", "FVG"],
    confluence: ["TREND_FIBO"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "FVG", "TREND_FIBO"],
    symbols: ["USDCAD"],
    timeframe: "15m",
    config: { min_rr: 2.7 },
    backtest: { winRate: 62.0, trades: 6, days: 7 },
  },

  // ============================================================
  // #5 BTCUSD - BOS + PINBAR (83.3% WR) - Top Performer
  // Highest winrate strategy from backtest
  // ============================================================
  {
    id: "5sym_BTCUSD_BOS_PINBAR",
    name: "BTCUSD Structure King (83.3% WR)",
    description: "Backtest: 83.3% WR (5W/1L), 6 trades in 7 days on BTCUSD 15m. BOS trigger with PINBAR_AT_LEVEL confluence. Top performing strategy!",
    triggers: ["BOS"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "PINBAR_AT_LEVEL"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.7 },
    backtest: { winRate: 83.3, trades: 6, days: 7 },
  },
]

// ============================================================
// Main Function
// ============================================================

async function addFiveSymbolStrategies() {
  console.log("=== Add 5 Symbol Winning Strategies to Firestore ===\n")
  console.log(`Target User: ${ADMIN_USER_EMAIL}`)
  console.log(`Strategies to add: ${FIVE_SYMBOL_STRATEGIES.length}`)
  console.log(`Symbols: EURUSD, EURJPY, GBPUSD, USDCAD, BTCUSD\n`)

  const db = getFirebaseAdminDb()

  // First, find user by email
  const usersRef = db.collection("users")
  const userQuery = await usersRef.where("email", "==", ADMIN_USER_EMAIL).limit(1).get()

  let userId: string

  if (userQuery.empty) {
    // Try lowercase email
    const lowerQuery = await usersRef.where("email", "==", ADMIN_USER_EMAIL.toLowerCase()).limit(1).get()
    if (lowerQuery.empty) {
      console.log(`User not found by email. Trying to use email as ID...`)
      // Check if user doc exists with email as ID (edge case)
      const directDoc = await usersRef.doc(ADMIN_USER_EMAIL).get()
      if (directDoc.exists) {
        userId = ADMIN_USER_EMAIL
      } else {
        console.error(`ERROR: User ${ADMIN_USER_EMAIL} not found in Firestore!`)
        console.log(`\nTo fix this:`)
        console.log(`1. Login to the dashboard with this email first`)
        console.log(`2. Or manually create a user doc in Firestore`)
        process.exit(1)
      }
    } else {
      userId = lowerQuery.docs[0].id
      console.log(`Found user by lowercase email. ID: ${userId}`)
    }
  } else {
    userId = userQuery.docs[0].id
    console.log(`Found user ID: ${userId}`)
  }

  const strategiesRef = db.collection("users").doc(userId).collection("strategies")

  // Check current strategy count
  const currentCount = await strategiesRef.count().get()
  console.log(`Current strategy count: ${currentCount.data().count}`)

  // Add each strategy
  let added = 0
  let skipped = 0

  for (const strategy of FIVE_SYMBOL_STRATEGIES) {
    try {
      // Check if strategy already exists
      const existingDoc = await strategiesRef.doc(strategy.id).get()

      if (existingDoc.exists) {
        console.log(`  ⏭ ${strategy.name} - already exists, skipping`)
        skipped++
        continue
      }

      const now = FieldValue.serverTimestamp()

      const strategyData = stripUndefinedDeep({
        // Identity
        name: strategy.name,
        description: strategy.description,

        // Detectors - flattened for compatibility
        detectors: strategy.detectors,
        triggers: strategy.triggers,
        confluence: strategy.confluence,
        gates: strategy.gates,
        confirms: [], // Legacy field

        // Symbol/Timeframe targeting
        symbols: strategy.symbols,
        timeframe: strategy.timeframe,

        // Config with risk settings
        config: {
          ...strategy.config,
          minConfirmHits: 1,
        },
        risk: {
          minRR: strategy.config.min_rr,
          maxRiskPercent: 2.0,
          minConfirmHits: 1,
        },

        // Cooldown to prevent duplicate signals
        cooldown_minutes: 60,

        // Backtest results (for reference)
        backtest: strategy.backtest,

        // Metadata
        enabled: true,
        is5SymbolStrategy: true,
        isWinningStrategy: true,
        version: 1,

        // Timestamps
        createdAt: now,
        updatedAt: now,
      })

      await strategiesRef.doc(strategy.id).set(strategyData)
      console.log(`  ✓ ${strategy.name} - added successfully`)
      added++
    } catch (error: any) {
      console.error(`  ✗ ${strategy.name} - failed: ${error?.message || error}`)
    }
  }

  console.log("\n=== Summary ===")
  console.log(`Added: ${added}`)
  console.log(`Skipped (existing): ${skipped}`)
  console.log(`Total requested: ${FIVE_SYMBOL_STRATEGIES.length}`)

  // Verify by listing strategies
  console.log("\n=== All Strategies for User ===")
  const allStrategies = await strategiesRef.orderBy("createdAt", "desc").limit(30).get()
  console.log(`Total strategies: ${allStrategies.size}`)

  allStrategies.forEach((doc) => {
    const data = doc.data()
    const symbol = Array.isArray(data.symbols) ? data.symbols.join(",") : "-"
    const winRate = data.backtest?.winRate ? `${data.backtest.winRate}% WR` : ""
    const tag = data.is5SymbolStrategy ? " [5-SYM]" : data.isWinningStrategy ? " [WIN]" : ""
    console.log(`  - ${data.name} | ${symbol} | ${winRate}${tag}`)
  })

  console.log("\n✅ Done! 5 symbol strategies added successfully.")
}

// Run
addFiveSymbolStrategies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
