/**
 * Find 60%+ Winrate Strategies for 5 Symbols
 *
 * Run with: npx tsx scripts/find-60-winrate-strategies.ts
 *
 * Target symbols: EURUSD, EURJPY, GBPUSD, USDCAD, BTCUSD
 * Goal: Find detector combinations that achieve 60%+ win rate
 * Output: Detailed trade logs with entry prices and timestamps
 */

import { config } from "dotenv"
config({ path: ".env.local" })

// ============================================================
// Configuration
// ============================================================

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

const TARGET_SYMBOLS = ["EURUSD", "EURJPY", "GBPUSD", "USDCAD", "BTCUSD"]
const MIN_WINRATE = 60
const MIN_TRADES = 3 // Minimum trades for statistical significance

// Date range: Last 30 days
const today = new Date()
const to = today.toISOString().split("T")[0]
const fromDate = new Date(today)
fromDate.setDate(fromDate.getDate() - 30)
const from = fromDate.toISOString().split("T")[0]

// ============================================================
// Detector Combinations to Test
// ============================================================

interface TestStrategy {
  id: string
  name: string
  detectors: string[]
  description: string
}

const STRATEGIES_TO_TEST: TestStrategy[] = [
  // BOS-based strategies
  {
    id: "test_BOS_only",
    name: "BOS Only",
    detectors: ["GATE_REGIME", "BOS"],
    description: "Simple Break of Structure",
  },
  {
    id: "test_BOS_PINBAR",
    name: "BOS + PINBAR",
    detectors: ["GATE_REGIME", "BOS", "PINBAR_AT_LEVEL"],
    description: "BOS with pinbar confirmation",
  },
  {
    id: "test_BOS_ENGULF",
    name: "BOS + ENGULF",
    detectors: ["GATE_REGIME", "BOS", "ENGULF_AT_LEVEL"],
    description: "BOS with engulfing confirmation",
  },
  {
    id: "test_BOS_FVG",
    name: "BOS + FVG",
    detectors: ["GATE_REGIME", "BOS", "FVG"],
    description: "BOS with Fair Value Gap",
  },

  // CHOCH-based strategies (Reversal)
  {
    id: "test_CHOCH_only",
    name: "CHOCH Only",
    detectors: ["GATE_REGIME", "CHOCH"],
    description: "Simple Change of Character",
  },
  {
    id: "test_CHOCH_PINBAR",
    name: "CHOCH + PINBAR",
    detectors: ["GATE_REGIME", "CHOCH", "PINBAR_AT_LEVEL"],
    description: "CHOCH with pinbar confirmation",
  },
  {
    id: "test_CHOCH_ENGULF",
    name: "CHOCH + ENGULF",
    detectors: ["GATE_REGIME", "CHOCH", "ENGULF_AT_LEVEL"],
    description: "CHOCH with engulfing confirmation",
  },

  // Order Block strategies
  {
    id: "test_OB_only",
    name: "OB Only",
    detectors: ["GATE_REGIME", "OB"],
    description: "Simple Order Block",
  },
  {
    id: "test_OB_PINBAR",
    name: "OB + PINBAR",
    detectors: ["GATE_REGIME", "OB", "PINBAR_AT_LEVEL"],
    description: "Order Block with pinbar",
  },
  {
    id: "test_OB_ENGULF",
    name: "OB + ENGULF",
    detectors: ["GATE_REGIME", "OB", "ENGULF_AT_LEVEL"],
    description: "Order Block with engulfing",
  },
  {
    id: "test_OB_FVG",
    name: "OB + FVG",
    detectors: ["GATE_REGIME", "OB", "FVG"],
    description: "Order Block with FVG",
  },

  // Sweep/SFP strategies (Reversal)
  {
    id: "test_SWEEP_only",
    name: "SWEEP Only",
    detectors: ["GATE_REGIME", "SWEEP"],
    description: "Simple Liquidity Sweep",
  },
  {
    id: "test_SWEEP_PINBAR",
    name: "SWEEP + PINBAR",
    detectors: ["GATE_REGIME", "SWEEP", "PINBAR_AT_LEVEL"],
    description: "Sweep with pinbar",
  },
  {
    id: "test_SFP_only",
    name: "SFP Only",
    detectors: ["GATE_REGIME", "SFP"],
    description: "Simple Swing Failure Pattern",
  },
  {
    id: "test_SFP_PINBAR",
    name: "SFP + PINBAR",
    detectors: ["GATE_REGIME", "SFP", "PINBAR_AT_LEVEL"],
    description: "SFP with pinbar",
  },

  // Break & Retest strategies
  {
    id: "test_BREAK_RETEST",
    name: "Break & Retest",
    detectors: ["GATE_REGIME", "BREAK_RETEST"],
    description: "Classic break and retest",
  },
  {
    id: "test_BREAK_RETEST_PINBAR",
    name: "Break Retest + PINBAR",
    detectors: ["GATE_REGIME", "BREAK_RETEST", "PINBAR_AT_LEVEL"],
    description: "Break retest with pinbar",
  },
  {
    id: "test_BREAK_RETEST_SR_ROLE",
    name: "Break Retest + SR Role",
    detectors: ["GATE_REGIME", "BREAK_RETEST", "SR_ROLE_REVERSAL"],
    description: "Break retest with S/R role reversal",
  },

  // S/R Bounce strategies
  {
    id: "test_SR_BOUNCE",
    name: "S/R Bounce",
    detectors: ["GATE_REGIME", "SR_BOUNCE"],
    description: "Support/Resistance bounce",
  },
  {
    id: "test_SR_BOUNCE_PINBAR",
    name: "S/R Bounce + PINBAR",
    detectors: ["GATE_REGIME", "SR_BOUNCE", "PINBAR_AT_LEVEL"],
    description: "S/R bounce with pinbar",
  },
  {
    id: "test_SR_BOUNCE_ENGULF",
    name: "S/R Bounce + ENGULF",
    detectors: ["GATE_REGIME", "SR_BOUNCE", "ENGULF_AT_LEVEL"],
    description: "S/R bounce with engulfing",
  },

  // Combined strategies
  {
    id: "test_BOS_CHOCH_PINBAR",
    name: "BOS + CHOCH + PINBAR",
    detectors: ["GATE_REGIME", "BOS", "CHOCH", "PINBAR_AT_LEVEL"],
    description: "Structure + pinbar combo",
  },
  {
    id: "test_BOS_OB",
    name: "BOS + OB",
    detectors: ["GATE_REGIME", "BOS", "OB"],
    description: "BOS with Order Block",
  },
  {
    id: "test_FVG_PINBAR",
    name: "FVG + PINBAR",
    detectors: ["GATE_REGIME", "FVG", "PINBAR_AT_LEVEL"],
    description: "FVG with pinbar confirmation",
  },

  // Volatility-gated strategies
  {
    id: "test_GATE_VOL_BOS_PINBAR",
    name: "Vol Gate + BOS + PINBAR",
    detectors: ["GATE_REGIME", "GATE_VOLATILITY", "BOS", "PINBAR_AT_LEVEL"],
    description: "Volatility filtered BOS",
  },
  {
    id: "test_GATE_VOL_OB_ENGULF",
    name: "Vol Gate + OB + ENGULF",
    detectors: ["GATE_REGIME", "GATE_VOLATILITY", "OB", "ENGULF_AT_LEVEL"],
    description: "Volatility filtered Order Block",
  },
]

// ============================================================
// Types
// ============================================================

interface TradeEntry {
  timestamp: string
  symbol: string
  direction: "BUY" | "SELL"
  entry: number
  sl: number
  tp: number
  rr: number
  outcome: "TP" | "SL" | "OPEN" | "TIME_EXIT"
  exitPrice?: number
  exitTime?: string
  pips?: number
}

interface SimResult {
  symbol: string
  strategy: string
  entries: number
  tp: number
  sl: number
  open: number
  timeExit: number
  winrate: number
  trades: TradeEntry[]
}

interface WinningCombo {
  symbol: string
  strategyId: string
  strategyName: string
  detectors: string[]
  winrate: number
  trades: number
  tradeDetails: TradeEntry[]
}

// ============================================================
// Simulation Runner
// ============================================================

async function runSimulation(
  symbol: string,
  strategy: TestStrategy,
  timeframe: string = "15m"
): Promise<SimResult | null> {
  if (!INTERNAL_API_KEY) {
    console.error("INTERNAL_API_KEY not set")
    return null
  }

  const payload = {
    uid: "test_runner",
    requestId: `test_${Date.now()}`,
    strategyId: strategy.id,
    strategy_id: strategy.id,
    symbols: [symbol],
    from,
    to,
    timeframe,
    mode: "winrate",
    strategy: {
      id: strategy.id,
      name: strategy.name,
      detectors: strategy.detectors,
      detectorsRequested: strategy.detectors,
      detectorsNormalized: strategy.detectors,
      detectorsUnknown: [],
      symbols: [symbol],
      timeframe,
      config: { min_rr: 2.5 },
    },
    demoMode: true,
  }

  try {
    const response = await fetch(`${BACKEND_ORIGIN}/api/strategy-sim/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.ok) {
      console.log(`  ⚠️ ${symbol} ${strategy.name}: ${data.error?.code || "ERROR"}`)
      return null
    }

    const summary = data.summary || data.combined?.summary || {}
    const trades: TradeEntry[] = []

    // Extract trade details from response
    if (data.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        trades.push({
          timestamp: entry.ts || entry.timestamp || "",
          symbol,
          direction: entry.direction || "BUY",
          entry: entry.entry || entry.entryPrice || 0,
          sl: entry.sl || entry.stopLoss || 0,
          tp: entry.tp || entry.takeProfit || 0,
          rr: entry.rr || 0,
          outcome: entry.outcome || "OPEN",
          exitPrice: entry.exitPrice,
          exitTime: entry.exitTs || entry.exitTime,
          pips: entry.pips,
        })
      }
    }

    return {
      symbol,
      strategy: strategy.name,
      entries: summary.entries || 0,
      tp: summary.tp || 0,
      sl: summary.sl || 0,
      open: summary.open || 0,
      timeExit: summary.timeExit || 0,
      winrate: summary.winrate || 0,
      trades,
    }
  } catch (err: any) {
    console.error(`  ❌ ${symbol} ${strategy.name}: ${err?.message}`)
    return null
  }
}

// ============================================================
// Main Function
// ============================================================

async function findWinningStrategies() {
  console.log("=".repeat(70))
  console.log("🔍 Finding 60%+ Winrate Strategies for 5 Symbols")
  console.log("=".repeat(70))
  console.log()
  console.log(`📅 Date Range: ${from} → ${to} (30 days)`)
  console.log(`🎯 Target Symbols: ${TARGET_SYMBOLS.join(", ")}`)
  console.log(`📊 Minimum Winrate: ${MIN_WINRATE}%`)
  console.log(`📈 Strategies to Test: ${STRATEGIES_TO_TEST.length}`)
  console.log(`⏱️ Total Tests: ${TARGET_SYMBOLS.length * STRATEGIES_TO_TEST.length}`)
  console.log()

  if (!INTERNAL_API_KEY) {
    console.error("❌ INTERNAL_API_KEY not set in .env.local")
    process.exit(1)
  }

  const winningCombos: WinningCombo[] = []
  const allResults: SimResult[] = []

  // Test each symbol
  for (const symbol of TARGET_SYMBOLS) {
    console.log(`\n${"─".repeat(60)}`)
    console.log(`📈 Testing ${symbol}...`)
    console.log(`${"─".repeat(60)}`)

    const symbolWinners: SimResult[] = []

    for (const strategy of STRATEGIES_TO_TEST) {
      process.stdout.write(`  ${strategy.name.padEnd(30)}`)

      const result = await runSimulation(symbol, strategy)

      if (result) {
        allResults.push(result)

        if (result.entries >= MIN_TRADES && result.winrate >= MIN_WINRATE) {
          symbolWinners.push(result)
          console.log(`✅ ${result.winrate.toFixed(1)}% WR (${result.entries} trades)`)

          winningCombos.push({
            symbol,
            strategyId: strategy.id,
            strategyName: strategy.name,
            detectors: strategy.detectors,
            winrate: result.winrate,
            trades: result.entries,
            tradeDetails: result.trades,
          })
        } else if (result.entries > 0) {
          console.log(`   ${result.winrate.toFixed(1)}% WR (${result.entries} trades)`)
        } else {
          console.log(`   No trades`)
        }
      } else {
        console.log(`   Failed`)
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200))
    }

    // Symbol summary
    if (symbolWinners.length > 0) {
      console.log(`\n  🏆 ${symbol} Winners (60%+):`)
      for (const w of symbolWinners.sort((a, b) => b.winrate - a.winrate)) {
        console.log(`     ${w.strategy}: ${w.winrate.toFixed(1)}% (${w.entries} trades)`)
      }
    } else {
      console.log(`\n  ⚠️ No 60%+ strategies found for ${symbol}`)
    }
  }

  // ============================================================
  // Final Report
  // ============================================================

  console.log("\n")
  console.log("=".repeat(70))
  console.log("📊 FINAL REPORT: 60%+ Winrate Strategies")
  console.log("=".repeat(70))
  console.log()

  if (winningCombos.length === 0) {
    console.log("❌ No strategies achieved 60%+ winrate with sufficient trades.")
    console.log()
    console.log("Best performers per symbol:")
    for (const symbol of TARGET_SYMBOLS) {
      const symbolResults = allResults.filter(
        (r) => r.symbol === symbol && r.entries >= MIN_TRADES
      )
      if (symbolResults.length > 0) {
        const best = symbolResults.sort((a, b) => b.winrate - a.winrate)[0]
        console.log(
          `  ${symbol}: ${best.strategy} - ${best.winrate.toFixed(1)}% (${best.entries} trades)`
        )
      } else {
        console.log(`  ${symbol}: No sufficient data`)
      }
    }
  } else {
    // Group by symbol
    for (const symbol of TARGET_SYMBOLS) {
      const symbolWinners = winningCombos.filter((w) => w.symbol === symbol)

      if (symbolWinners.length > 0) {
        console.log(`\n${"═".repeat(60)}`)
        console.log(`📈 ${symbol} - 60%+ Strategies`)
        console.log(`${"═".repeat(60)}`)

        for (const combo of symbolWinners.sort((a, b) => b.winrate - a.winrate)) {
          console.log()
          console.log(`┌─ ${combo.strategyName} ─────────────────────────────────`)
          console.log(`│ Winrate: ${combo.winrate.toFixed(1)}%`)
          console.log(`│ Total Trades: ${combo.trades}`)
          console.log(`│ Detectors: ${combo.detectors.join(" + ")}`)
          console.log(`│`)

          // Show trade details
          if (combo.tradeDetails.length > 0) {
            console.log(`│ Trade Details:`)
            console.log(`│ ${"─".repeat(55)}`)
            console.log(
              `│ ${"Date".padEnd(20)} ${"Dir".padEnd(5)} ${"Entry".padEnd(12)} ${"SL".padEnd(12)} ${"Outcome".padEnd(8)}`
            )
            console.log(`│ ${"─".repeat(55)}`)

            for (const trade of combo.tradeDetails) {
              const date = trade.timestamp
                ? new Date(trade.timestamp).toISOString().replace("T", " ").slice(0, 16)
                : "N/A"
              const dir = trade.direction
              const entry = trade.entry ? trade.entry.toFixed(5) : "N/A"
              const sl = trade.sl ? trade.sl.toFixed(5) : "N/A"
              const outcome = trade.outcome

              console.log(
                `│ ${date.padEnd(20)} ${dir.padEnd(5)} ${entry.padEnd(12)} ${sl.padEnd(12)} ${outcome.padEnd(8)}`
              )
            }
          } else {
            console.log(`│ (Detailed trade logs not available from backend)`)
          }

          console.log(`└${"─".repeat(58)}`)
        }
      }
    }
  }

  // Summary table
  console.log("\n")
  console.log("=".repeat(70))
  console.log("📋 SUMMARY TABLE")
  console.log("=".repeat(70))
  console.log()
  console.log(
    `${"Symbol".padEnd(10)} ${"Strategy".padEnd(25)} ${"WR%".padEnd(8)} ${"Trades".padEnd(8)} ${"Detectors"}`
  )
  console.log("─".repeat(70))

  for (const combo of winningCombos.sort((a, b) => b.winrate - a.winrate)) {
    console.log(
      `${combo.symbol.padEnd(10)} ${combo.strategyName.padEnd(25)} ${combo.winrate.toFixed(1).padEnd(8)} ${combo.trades.toString().padEnd(8)} ${combo.detectors.slice(1).join(", ")}`
    )
  }

  console.log()
  console.log(`Total winning combinations: ${winningCombos.length}`)
  console.log()
}

// Run
findWinningStrategies()
  .then(() => {
    console.log("\n✅ Analysis complete!")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
