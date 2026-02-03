/**
 * Add 15 Symbol-Specific Strategies to User Account
 *
 * Run with: npx tsx scripts/add-15-symbol-strategies.ts
 *
 * All 15 symbols with optimized strategies targeting 60%+ win rate
 * Based on backtest analysis with symbol-specific filtering
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { getFirebaseAdminDb, stripUndefinedDeep } from "../lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Target user email
const TARGET_USER_EMAIL = "Kamnasjey@gmail.com"

// ============================================================
// 15 Symbol-Specific Strategies
// ============================================================

interface SymbolStrategy {
  id: string
  name: string
  description: string
  symbol: string
  detectors: string[]
  triggers: string[]
  confluence: string[]
  gates: string[]
  allowedRegimes: string[]
  timeframe: string
  config: {
    min_score: number
    min_rr: number
    detector_weights?: Record<string, number>
  }
  multiTf?: {
    entry_tfs: string[]
    trend_tfs: string[]
    trend_ma_period: number
  }
  backtest_winrate: number
  notes: string
}

const FIFTEEN_SYMBOL_STRATEGIES: SymbolStrategy[] = [
  // #1 AUDJPY - Best Performer (64.3% WR)
  {
    id: "AUDJPY_trend_master",
    name: "AUDJPY - Trend Master (64% proven)",
    symbol: "AUDJPY",
    description: "Best performer. JPY trend following with SMC.",
    triggers: ["BOS", "MOMENTUM_CONTINUATION"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "MOMENTUM_CONTINUATION", "FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.2,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, MOMENTUM_CONTINUATION: 1.2, FIBO_RETRACE_CONFLUENCE: 1.0, SR_BOUNCE: 1.0, PINBAR_AT_LEVEL: 0.8 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 64.3,
    notes: "Proven 64.3% win rate in backtest. Keep settings."
  },

  // #2 USDJPY - Strong Performer (56.2% WR)
  {
    id: "USDJPY_trend_momentum",
    name: "USDJPY - Trend Momentum (56% proven)",
    symbol: "USDJPY",
    description: "Strong performer. Momentum with structure.",
    triggers: ["BOS", "MOMENTUM_CONTINUATION"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "FLAG_PENNANT", "SR_BOUNCE"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "MOMENTUM_CONTINUATION", "FIBO_RETRACE_CONFLUENCE", "FLAG_PENNANT", "SR_BOUNCE"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.3,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, MOMENTUM_CONTINUATION: 1.3, FIBO_RETRACE_CONFLUENCE: 1.0, FLAG_PENNANT: 0.8, SR_BOUNCE: 1.0 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 56.2,
    notes: "Proven 56.2% win rate. Need more confluence for 60%+."
  },

  // #3 EURJPY - JPY Cross (50% WR)
  {
    id: "EURJPY_trend_pullback",
    name: "EURJPY - Trend Pullback (50% intraday)",
    symbol: "EURJPY",
    description: "JPY cross with good intraday performance.",
    triggers: ["BOS", "CHOCH"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.5,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, FIBO_RETRACE_CONFLUENCE: 1.2, SR_BOUNCE: 1.0, PINBAR_AT_LEVEL: 1.0, ENGULF_AT_LEVEL: 0.8 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 50.0,
    notes: "Higher min_score for better filtering."
  },

  // #4 GBPJPY - High Volatility (45.5% WR)
  {
    id: "GBPJPY_volatility_trend",
    name: "GBPJPY - Volatility Trend (45.5%)",
    symbol: "GBPJPY",
    description: "High volatility JPY cross. Needs strict filtering.",
    triggers: ["BOS", "CHOCH"],
    confluence: ["ORDER_BLOCK", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "ORDER_BLOCK", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 3.0,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, ORDER_BLOCK: 1.3, FIBO_RETRACE_CONFLUENCE: 1.0, PINBAR_AT_LEVEL: 1.0, ENGULF_AT_LEVEL: 0.8 }
    },
    multiTf: { entry_tfs: ["15m", "1h"], trend_tfs: ["4h"], trend_ma_period: 20 },
    backtest_winrate: 45.5,
    notes: "Higher min_score and RR due to volatility."
  },

  // #5 XAUUSD - Gold SMC (44.4% WR)
  {
    id: "XAUUSD_gold_smc",
    name: "XAUUSD - Gold SMC (44.4%)",
    symbol: "XAUUSD",
    description: "Gold trading with SMC principles.",
    triggers: ["BOS", "CHOCH", "SWEEP"],
    confluence: ["ORDER_BLOCK", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "ORDER_BLOCK", "SWEEP", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, ORDER_BLOCK: 1.3, SWEEP: 1.2, SR_BOUNCE: 1.0, FIBO_RETRACE_CONFLUENCE: 1.0 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 44.4,
    notes: "Gold needs strong SMC confluence."
  },

  // #6 EURUSD - Conservative (30% WR -> strict filter)
  {
    id: "EURUSD_conservative",
    name: "EURUSD - Conservative (30%->60%)",
    symbol: "EURUSD",
    description: "Major pair. Very strict filtering needed.",
    triggers: ["BOS", "CHOCH", "BREAKOUT_RETEST_ENTRY"],
    confluence: ["SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL", "BREAKOUT_RETEST_ENTRY"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 3.0,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, SR_BOUNCE: 1.2, FIBO_RETRACE_CONFLUENCE: 1.0, PINBAR_AT_LEVEL: 1.0, ENGULF_AT_LEVEL: 0.8, BREAKOUT_RETEST_ENTRY: 1.3 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 30.0,
    notes: "Strict min_score=3.0 required for quality."
  },

  // #7 USDCAD - Breakout Focus (40% WR)
  {
    id: "USDCAD_breakout",
    name: "USDCAD - Breakout (40%->60%)",
    symbol: "USDCAD",
    description: "Oil correlated. Breakout focus.",
    triggers: ["BOS", "SR_BREAK_CLOSE", "BREAKOUT_RETEST_ENTRY"],
    confluence: ["SR_ROLE_REVERSAL", "MOMENTUM_CONTINUATION"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "SR_BREAK_CLOSE", "BREAKOUT_RETEST_ENTRY", "SR_ROLE_REVERSAL", "MOMENTUM_CONTINUATION"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.3, SR_BREAK_CLOSE: 1.5, BREAKOUT_RETEST_ENTRY: 1.8, SR_ROLE_REVERSAL: 1.2, MOMENTUM_CONTINUATION: 0.8 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 40.0,
    notes: "Breakout + Retest strategy for USDCAD."
  },

  // #8 BTCUSD - Crypto SMC (36.4% WR)
  {
    id: "BTCUSD_crypto_smc",
    name: "BTCUSD - Crypto SMC (36%->60%)",
    symbol: "BTCUSD",
    description: "Bitcoin. High volatility SMC approach.",
    triggers: ["BOS", "CHOCH", "SWEEP", "SFP"],
    confluence: ["ORDER_BLOCK", "SR_BOUNCE"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "ORDER_BLOCK", "SWEEP", "SFP", "SR_BOUNCE"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 3.0,
      min_rr: 3.0,
      detector_weights: { BOS: 1.5, CHOCH: 1.8, ORDER_BLOCK: 1.5, SWEEP: 1.3, SFP: 1.3, SR_BOUNCE: 1.0 }
    },
    multiTf: { entry_tfs: ["15m", "1h"], trend_tfs: ["4h"], trend_ma_period: 20 },
    backtest_winrate: 36.4,
    notes: "Very strict filtering for crypto volatility."
  },

  // #9 AUDUSD - Aussie Trend (33.3% WR)
  {
    id: "AUDUSD_aussie_trend",
    name: "AUDUSD - Aussie Trend (33%->60%)",
    symbol: "AUDUSD",
    description: "Commodity currency. Trend following.",
    triggers: ["BOS", "MOMENTUM_CONTINUATION"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "MOMENTUM_CONTINUATION", "FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, MOMENTUM_CONTINUATION: 1.3, FIBO_RETRACE_CONFLUENCE: 1.2, SR_BOUNCE: 1.0, PINBAR_AT_LEVEL: 1.0 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 33.3,
    notes: "Higher min_score for quality filtering."
  },

  // #10 EURAUD - Cross SMC (38.9% WR)
  {
    id: "EURAUD_cross_smc",
    name: "EURAUD - Cross SMC (39%->60%)",
    symbol: "EURAUD",
    description: "EUR/AUD cross. SMC focused.",
    triggers: ["BOS", "CHOCH"],
    confluence: ["ORDER_BLOCK", "FIBO_RETRACE_CONFLUENCE", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "ORDER_BLOCK", "FIBO_RETRACE_CONFLUENCE", "ENGULF_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, ORDER_BLOCK: 1.3, FIBO_RETRACE_CONFLUENCE: 1.0, ENGULF_AT_LEVEL: 1.0 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 38.9,
    notes: "SMC approach with Order Blocks."
  },

  // #11 NZDUSD - Kiwi Trend (37.5% WR)
  {
    id: "NZDUSD_kiwi_trend",
    name: "NZDUSD - Kiwi Trend (37%->60%)",
    symbol: "NZDUSD",
    description: "NZD trend following.",
    triggers: ["BOS", "MOMENTUM_CONTINUATION"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "MOMENTUM_CONTINUATION", "FIBO_RETRACE_CONFLUENCE", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, MOMENTUM_CONTINUATION: 1.2, FIBO_RETRACE_CONFLUENCE: 1.0, SR_BOUNCE: 1.0, PINBAR_AT_LEVEL: 1.0 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 37.5,
    notes: "Similar to AUDUSD approach."
  },

  // #12 USDCHF - Swiss Conservative (38.5% WR)
  {
    id: "USDCHF_swiss_conservative",
    name: "USDCHF - Swiss Conservative (38%->60%)",
    symbol: "USDCHF",
    description: "Safe haven pair. Conservative approach.",
    triggers: ["BOS"],
    confluence: ["SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "ENGULF_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 2.8,
      min_rr: 2.5,
      detector_weights: { BOS: 1.5, SR_BOUNCE: 1.3, FIBO_RETRACE_CONFLUENCE: 1.2, PINBAR_AT_LEVEL: 1.0, ENGULF_AT_LEVEL: 0.8 }
    },
    multiTf: { entry_tfs: ["15m"], trend_tfs: ["1h", "4h"], trend_ma_period: 20 },
    backtest_winrate: 38.5,
    notes: "Conservative SR bounce approach."
  },

  // #13 GBPUSD - Cable Strict (25% WR -> very strict)
  {
    id: "GBPUSD_cable_strict",
    name: "GBPUSD - Cable Strict (25%->60%)",
    symbol: "GBPUSD",
    description: "Cable needs very strict filtering.",
    triggers: ["BOS", "CHOCH"],
    confluence: ["ORDER_BLOCK", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "ENGULF_AT_LEVEL"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "ORDER_BLOCK", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "ENGULF_AT_LEVEL"],
    allowedRegimes: ["TREND_UP", "TREND_DOWN"],
    timeframe: "15m",
    config: {
      min_score: 3.2,
      min_rr: 3.0,
      detector_weights: { BOS: 1.5, CHOCH: 1.5, ORDER_BLOCK: 1.5, SR_BOUNCE: 1.2, FIBO_RETRACE_CONFLUENCE: 1.0, ENGULF_AT_LEVEL: 1.0 }
    },
    multiTf: { entry_tfs: ["15m", "1h"], trend_tfs: ["4h"], trend_ma_period: 20 },
    backtest_winrate: 25.0,
    notes: "Very strict min_score=3.2 for poor performer."
  },

  // #14 EURGBP - Ranging Only (16.7% WR -> range trading)
  {
    id: "EURGBP_ranging_only",
    name: "EURGBP - Ranging Only (17%->60%)",
    symbol: "EURGBP",
    description: "Low volatility. Range trading only.",
    triggers: ["RECTANGLE_RANGE_EDGE", "SR_BOUNCE", "FAKEOUT_TRAP"],
    confluence: ["PINBAR_AT_LEVEL", "DOUBLE_TOP_BOTTOM"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "RECTANGLE_RANGE_EDGE", "SR_BOUNCE", "FAKEOUT_TRAP", "PINBAR_AT_LEVEL", "DOUBLE_TOP_BOTTOM"],
    allowedRegimes: ["RANGING"],
    timeframe: "15m",
    config: {
      min_score: 3.5,
      min_rr: 2.0,
      detector_weights: { RECTANGLE_RANGE_EDGE: 1.8, SR_BOUNCE: 1.5, FAKEOUT_TRAP: 1.3, PINBAR_AT_LEVEL: 1.0, DOUBLE_TOP_BOTTOM: 1.0 }
    },
    multiTf: { entry_tfs: ["15m", "1h"], trend_tfs: ["4h"], trend_ma_period: 50 },
    backtest_winrate: 16.7,
    notes: "Range trading approach for this poor performer."
  },

  // #15 EURCHF - Ultra Strict (25% WR)
  {
    id: "EURCHF_ultra_strict",
    name: "EURCHF - Ultra Strict (25%->60%)",
    symbol: "EURCHF",
    description: "Very low volatility. Ultra strict filtering.",
    triggers: ["SR_BOUNCE"],
    confluence: ["FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "DOUBLE_TOP_BOTTOM", "RECTANGLE_RANGE_EDGE"],
    gates: ["GATE_REGIME"],
    detectors: ["GATE_REGIME", "SR_BOUNCE", "FIBO_RETRACE_CONFLUENCE", "PINBAR_AT_LEVEL", "DOUBLE_TOP_BOTTOM", "RECTANGLE_RANGE_EDGE"],
    allowedRegimes: ["RANGING", "TREND_UP", "TREND_DOWN"],
    timeframe: "1h",
    config: {
      min_score: 3.5,
      min_rr: 2.0,
      detector_weights: { SR_BOUNCE: 1.5, FIBO_RETRACE_CONFLUENCE: 1.3, PINBAR_AT_LEVEL: 1.2, DOUBLE_TOP_BOTTOM: 1.0, RECTANGLE_RANGE_EDGE: 1.0 }
    },
    multiTf: { entry_tfs: ["1h"], trend_tfs: ["4h"], trend_ma_period: 50 },
    backtest_winrate: 25.0,
    notes: "1h entry only. Ultra strict for poor performer."
  },
]

// ============================================================
// Main Function
// ============================================================

async function addFifteenSymbolStrategies() {
  console.log("=== Add 15 Symbol-Specific Strategies to Firestore ===\n")
  console.log(`Target User: ${TARGET_USER_EMAIL}`)
  console.log(`Strategies to add: ${FIFTEEN_SYMBOL_STRATEGIES.length}`)
  console.log(`Symbols: All 15 trading symbols\n`)

  const db = getFirebaseAdminDb()

  // Find user by email
  const usersRef = db.collection("users")
  const userQuery = await usersRef.where("email", "==", TARGET_USER_EMAIL).limit(1).get()

  let userId: string

  if (userQuery.empty) {
    const lowerQuery = await usersRef.where("email", "==", TARGET_USER_EMAIL.toLowerCase()).limit(1).get()
    if (lowerQuery.empty) {
      console.log(`User not found by email. Trying to use email as ID...`)
      const directDoc = await usersRef.doc(TARGET_USER_EMAIL).get()
      if (directDoc.exists) {
        userId = TARGET_USER_EMAIL
      } else {
        console.error(`ERROR: User ${TARGET_USER_EMAIL} not found in Firestore!`)
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
  console.log(`Current strategy count: ${currentCount.data().count}\n`)

  // Add each strategy
  let added = 0
  let skipped = 0
  let updated = 0

  for (const strategy of FIFTEEN_SYMBOL_STRATEGIES) {
    try {
      const existingDoc = await strategiesRef.doc(strategy.id).get()

      if (existingDoc.exists) {
        // Update existing strategy
        const now = FieldValue.serverTimestamp()

        const strategyData = stripUndefinedDeep({
          name: strategy.name,
          description: strategy.description,
          detectors: strategy.detectors,
          triggers: strategy.triggers,
          confluence: strategy.confluence,
          gates: strategy.gates,
          symbols: [strategy.symbol],
          timeframe: strategy.timeframe,
          allowedRegimes: strategy.allowedRegimes,
          config: {
            ...strategy.config,
            minConfirmHits: 1,
          },
          multiTf: strategy.multiTf,
          risk: {
            minRR: strategy.config.min_rr,
            minScore: strategy.config.min_score,
            maxRiskPercent: 2.0,
            minConfirmHits: 1,
          },
          cooldown_minutes: 60,
          backtest: {
            winRate: strategy.backtest_winrate,
            notes: strategy.notes,
          },
          enabled: true,
          is15SymbolStrategy: true,
          isWinningStrategy: true,
          version: 2,
          updatedAt: now,
        })

        await strategiesRef.doc(strategy.id).update(strategyData)
        console.log(`  ↻ ${strategy.name} - updated`)
        updated++
        continue
      }

      const now = FieldValue.serverTimestamp()

      const strategyData = stripUndefinedDeep({
        name: strategy.name,
        description: strategy.description,
        detectors: strategy.detectors,
        triggers: strategy.triggers,
        confluence: strategy.confluence,
        gates: strategy.gates,
        confirms: [],
        symbols: [strategy.symbol],
        timeframe: strategy.timeframe,
        allowedRegimes: strategy.allowedRegimes,
        config: {
          ...strategy.config,
          minConfirmHits: 1,
        },
        multiTf: strategy.multiTf,
        risk: {
          minRR: strategy.config.min_rr,
          minScore: strategy.config.min_score,
          maxRiskPercent: 2.0,
          minConfirmHits: 1,
        },
        cooldown_minutes: 60,
        backtest: {
          winRate: strategy.backtest_winrate,
          notes: strategy.notes,
        },
        enabled: true,
        is15SymbolStrategy: true,
        isWinningStrategy: true,
        version: 2,
        createdAt: now,
        updatedAt: now,
      })

      await strategiesRef.doc(strategy.id).set(strategyData)
      console.log(`  ✓ ${strategy.name} - added`)
      added++
    } catch (error: any) {
      console.error(`  ✗ ${strategy.name} - failed: ${error?.message || error}`)
    }
  }

  console.log("\n=== Summary ===")
  console.log(`Added: ${added}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Total requested: ${FIFTEEN_SYMBOL_STRATEGIES.length}`)

  // Verify by listing strategies
  console.log("\n=== All Symbol Strategies for User ===")
  const allStrategies = await strategiesRef.where("is15SymbolStrategy", "==", true).get()
  console.log(`Total 15-symbol strategies: ${allStrategies.size}`)

  allStrategies.forEach((doc) => {
    const data = doc.data()
    const symbol = Array.isArray(data.symbols) ? data.symbols.join(",") : "-"
    const winRate = data.backtest?.winRate ? `${data.backtest.winRate}% WR` : ""
    console.log(`  - ${symbol}: ${data.name} | ${winRate}`)
  })

  console.log("\n✅ Done! 15 symbol-specific strategies added successfully.")
  console.log("\nNext steps:")
  console.log("1. Go to Dashboard -> Strategies page")
  console.log("2. Enable the strategies you want to use")
  console.log("3. VPS scanner will automatically use enabled strategies")
}

// Run
addFifteenSymbolStrategies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
