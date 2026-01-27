/**
 * Add Winning Strategies to Admin User in Firestore
 * 
 * Run with: npx tsx scripts/add-winning-strategies.ts
 * 
 * Prerequisites:
 * - Firebase Admin credentials configured
 * - .env.local with FIREBASE_ADMIN_* set
 * 
 * These are the top winning strategies from 7-day backtest across 16 symbols:
 * - Minimum Win Rate: 60%
 * - Minimum Risk/Reward: 2.5
 * - Minimum Entries: 4+
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { getFirebaseAdminDb, stripUndefinedDeep } from "../lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Admin user email
const ADMIN_USER_EMAIL = "Kamnasjey@gmail.com"

// ============================================================
// Winning Strategy Templates (from 7-day backtest)
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

const WINNING_STRATEGIES: WinningStrategy[] = [
  // ============================================================
  // #1 BTCUSD BOS+PINBAR — 83.3% WR
  // ============================================================
  {
    id: "win_BTCUSD_BOS_PINBAR",
    name: "BTCUSD BOS+PINBAR (83% WR)",
    description: "Backtest: 83.3% WR (5W/1L), 6 trades in 7 days on BTCUSD 15m. BOS trigger with PINBAR_AT_LEVEL confluence confirmation at key structure breaks.",
    triggers: ["BOS"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: [],
    detectors: ["BOS", "PINBAR_AT_LEVEL"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 83.3, trades: 6, days: 7 },
  },

  // ============================================================
  // #2 BTCUSD CHOCH+PINBAR — 80% WR
  // ============================================================
  {
    id: "win_BTCUSD_CHOCH_PINBAR",
    name: "BTCUSD CHOCH+PINBAR (80% WR)",
    description: "Backtest: 80.0% WR (4W/1L), 5 trades in 7 days on BTCUSD 15m. CHOCH (Change of Character) trigger with PINBAR_AT_LEVEL confluence for reversal entries.",
    triggers: ["CHOCH"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: [],
    detectors: ["CHOCH", "PINBAR_AT_LEVEL"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 80.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #3 BTCUSD BOS+CHOCH+PINBAR — 77.8% WR (Most Trades)
  // ============================================================
  {
    id: "win_BTCUSD_BOS_CHOCH_PINBAR",
    name: "BTCUSD Structure+PINBAR (77.8% WR)",
    description: "Backtest: 77.8% WR (7W/2L), 9 trades in 7 days on BTCUSD 15m. Combined BOS + CHOCH triggers with PINBAR_AT_LEVEL. Higher trade frequency with strong win rate.",
    triggers: ["BOS", "CHOCH"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: [],
    detectors: ["BOS", "CHOCH", "PINBAR_AT_LEVEL"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 77.8, trades: 9, days: 7 },
  },

  // ============================================================
  // #4 BTCUSDT OB — 75% WR
  // ============================================================
  {
    id: "win_BTCUSDT_OB",
    name: "BTCUSDT Order Block (75% WR)",
    description: "Backtest: 75.0% WR (3W/1L), 4 trades in 7 days on BTCUSDT 15m. Pure Order Block strategy with simple execution.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["BTCUSDT"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 75.0, trades: 4, days: 7 },
  },

  // ============================================================
  // #5 USDCHF OB+DOJI — 66.7% WR
  // ============================================================
  {
    id: "win_USDCHF_OB_DOJI",
    name: "USDCHF OB+DOJI (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on USDCHF 15m. Order Block trigger with DOJI confluence for indecision confirmation at levels.",
    triggers: ["OB"],
    confluence: ["DOJI"],
    gates: [],
    detectors: ["OB", "DOJI"],
    symbols: ["USDCHF"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #6 BTCUSD BOS Only — 66.7% WR
  // ============================================================
  {
    id: "win_BTCUSD_BOS",
    name: "BTCUSD BOS Only (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on BTCUSD 15m. Simple Break of Structure strategy. High frequency, solid win rate.",
    triggers: ["BOS"],
    confluence: [],
    gates: [],
    detectors: ["BOS"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #7 XAUUSD OB — 66.7% WR
  // ============================================================
  {
    id: "win_XAUUSD_OB",
    name: "XAUUSD Order Block (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on XAUUSD 15m. Gold Order Block entries at key supply/demand zones.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["XAUUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #8 EURUSD BOS+PINBAR — 66.7% WR
  // ============================================================
  {
    id: "win_EURUSD_BOS_PINBAR",
    name: "EURUSD BOS+PINBAR (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on EURUSD 15m. Structure break with pinbar confirmation on the major pair.",
    triggers: ["BOS"],
    confluence: ["PINBAR_AT_LEVEL"],
    gates: [],
    detectors: ["BOS", "PINBAR_AT_LEVEL"],
    symbols: ["EURUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #9 GBPUSD OB — 66.7% WR
  // ============================================================
  {
    id: "win_GBPUSD_OB",
    name: "GBPUSD Order Block (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on GBPUSD 15m. Cable Order Block entries.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["GBPUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #10 NZDUSD OB — 66.7% WR
  // ============================================================
  {
    id: "win_NZDUSD_OB",
    name: "NZDUSD Order Block (66.7% WR)",
    description: "Backtest: 66.7% WR (4W/2L), 6 trades in 7 days on NZDUSD 15m. Kiwi Order Block strategy.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["NZDUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 66.7, trades: 6, days: 7 },
  },

  // ============================================================
  // #11 USDJPY OB — 60% WR
  // ============================================================
  {
    id: "win_USDJPY_OB",
    name: "USDJPY Order Block (60% WR)",
    description: "Backtest: 60.0% WR (3W/2L), 5 trades in 7 days on USDJPY 15m. Dollar-Yen Order Block at key levels.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["USDJPY"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 60.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #12 AUDUSD OB — 60% WR
  // ============================================================
  {
    id: "win_AUDUSD_OB",
    name: "AUDUSD Order Block (60% WR)",
    description: "Backtest: 60.0% WR (3W/2L), 5 trades in 7 days on AUDUSD 15m. Aussie Order Block entries.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["AUDUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 60.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #13 BTCUSD CHOCH Only — 60% WR (High Frequency)
  // ============================================================
  {
    id: "win_BTCUSD_CHOCH",
    name: "BTCUSD CHOCH (60% WR, High Freq)",
    description: "Backtest: 60.0% WR (6W/4L), 10 trades in 7 days on BTCUSD 15m. Change of Character for trend reversal. Highest frequency strategy.",
    triggers: ["CHOCH"],
    confluence: [],
    gates: [],
    detectors: ["CHOCH"],
    symbols: ["BTCUSD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 60.0, trades: 10, days: 7 },
  },

  // ============================================================
  // #14 BTCUSDT OB+ENGULF — 60% WR
  // ============================================================
  {
    id: "win_BTCUSDT_OB_ENGULF",
    name: "BTCUSDT OB+ENGULF (60% WR)",
    description: "Backtest: 60.0% WR (3W/2L), 5 trades in 7 days on BTCUSDT 15m. Order Block with Engulfing pattern confluence.",
    triggers: ["OB"],
    confluence: ["ENGULF_AT_LEVEL"],
    gates: [],
    detectors: ["OB", "ENGULF_AT_LEVEL"],
    symbols: ["BTCUSDT"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 60.0, trades: 5, days: 7 },
  },

  // ============================================================
  // #15 USDCAD OB — 60% WR
  // ============================================================
  {
    id: "win_USDCAD_OB",
    name: "USDCAD Order Block (60% WR)",
    description: "Backtest: 60.0% WR (3W/2L), 5 trades in 7 days on USDCAD 15m. Loonie Order Block strategy.",
    triggers: ["OB"],
    confluence: [],
    gates: [],
    detectors: ["OB"],
    symbols: ["USDCAD"],
    timeframe: "15m",
    config: { min_rr: 2.5 },
    backtest: { winRate: 60.0, trades: 5, days: 7 },
  },
]

// ============================================================
// Main Function
// ============================================================

async function addWinningStrategiesToUser() {
  console.log("=== Add Winning Strategies to Firestore ===\n")
  console.log(`Target User: ${ADMIN_USER_EMAIL}`)
  console.log(`Strategies to add: ${WINNING_STRATEGIES.length}\n`)

  const db = getFirebaseAdminDb()

  // First, find user by email
  const usersRef = db.collection("users")
  const userQuery = await usersRef.where("email", "==", ADMIN_USER_EMAIL).limit(1).get()

  let userId: string

  if (userQuery.empty) {
    console.log(`User not found by email, using email as ID...`)
    userId = ADMIN_USER_EMAIL
  } else {
    userId = userQuery.docs[0].id
    console.log(`Found user ID: ${userId}`)
  }

  const strategiesRef = db.collection("users").doc(userId).collection("strategies")

  // Add each strategy
  let added = 0
  let skipped = 0

  for (const strategy of WINNING_STRATEGIES) {
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
        
        // Config
        config: strategy.config,
        risk: {
          minRR: strategy.config.min_rr,
          maxRiskPercent: 2.0,
          minConfirmHits: 1,
        },
        
        // Backtest results (for reference)
        backtest: strategy.backtest,
        
        // Metadata
        enabled: true,
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
  console.log(`Total in template: ${WINNING_STRATEGIES.length}`)
  
  // Verify by listing strategies
  console.log("\n=== Verifying Strategies ===")
  const allStrategies = await strategiesRef.orderBy("createdAt", "desc").limit(20).get()
  console.log(`Total strategies for user: ${allStrategies.size}`)
  
  allStrategies.forEach((doc) => {
    const data = doc.data()
    const isWinning = data.isWinningStrategy ? " [WINNING]" : ""
    console.log(`  - ${data.name}${isWinning}`)
  })

  console.log("\n✅ Done!")
}

// Run
addWinningStrategiesToUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
