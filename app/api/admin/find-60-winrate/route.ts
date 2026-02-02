/**
 * POST /api/admin/find-60-winrate
 *
 * Find 60%+ winrate strategies for 5 symbols via backtest
 * Returns detailed trade logs with entry prices
 *
 * Requires x-internal-api-key header
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

// Verify API key
function isValidKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key")
  return !!key && !!INTERNAL_API_KEY && key === INTERNAL_API_KEY
}

// Target symbols
const TARGET_SYMBOLS = ["EURUSD", "EURJPY", "GBPUSD", "USDCAD", "BTCUSD"]
const MIN_WINRATE = 60
const MIN_TRADES = 3

// Strategy combinations to test
interface TestStrategy {
  id: string
  name: string
  detectors: string[]
}

const STRATEGIES_TO_TEST: TestStrategy[] = [
  { id: "BOS_only", name: "BOS Only", detectors: ["GATE_REGIME", "BOS"] },
  { id: "BOS_PINBAR", name: "BOS + PINBAR", detectors: ["GATE_REGIME", "BOS", "PINBAR_AT_LEVEL"] },
  { id: "BOS_ENGULF", name: "BOS + ENGULF", detectors: ["GATE_REGIME", "BOS", "ENGULF_AT_LEVEL"] },
  { id: "BOS_FVG", name: "BOS + FVG", detectors: ["GATE_REGIME", "BOS", "FVG"] },
  { id: "CHOCH_only", name: "CHOCH Only", detectors: ["GATE_REGIME", "CHOCH"] },
  { id: "CHOCH_PINBAR", name: "CHOCH + PINBAR", detectors: ["GATE_REGIME", "CHOCH", "PINBAR_AT_LEVEL"] },
  { id: "CHOCH_ENGULF", name: "CHOCH + ENGULF", detectors: ["GATE_REGIME", "CHOCH", "ENGULF_AT_LEVEL"] },
  { id: "OB_only", name: "OB Only", detectors: ["GATE_REGIME", "OB"] },
  { id: "OB_PINBAR", name: "OB + PINBAR", detectors: ["GATE_REGIME", "OB", "PINBAR_AT_LEVEL"] },
  { id: "OB_ENGULF", name: "OB + ENGULF", detectors: ["GATE_REGIME", "OB", "ENGULF_AT_LEVEL"] },
  { id: "OB_FVG", name: "OB + FVG", detectors: ["GATE_REGIME", "OB", "FVG"] },
  { id: "SWEEP_only", name: "SWEEP Only", detectors: ["GATE_REGIME", "SWEEP"] },
  { id: "SWEEP_PINBAR", name: "SWEEP + PINBAR", detectors: ["GATE_REGIME", "SWEEP", "PINBAR_AT_LEVEL"] },
  { id: "SFP_only", name: "SFP Only", detectors: ["GATE_REGIME", "SFP"] },
  { id: "SFP_PINBAR", name: "SFP + PINBAR", detectors: ["GATE_REGIME", "SFP", "PINBAR_AT_LEVEL"] },
  { id: "BREAK_RETEST", name: "Break & Retest", detectors: ["GATE_REGIME", "BREAK_RETEST"] },
  { id: "BREAK_RETEST_PINBAR", name: "Break Retest + PINBAR", detectors: ["GATE_REGIME", "BREAK_RETEST", "PINBAR_AT_LEVEL"] },
  { id: "SR_BOUNCE", name: "S/R Bounce", detectors: ["GATE_REGIME", "SR_BOUNCE"] },
  { id: "SR_BOUNCE_PINBAR", name: "S/R Bounce + PINBAR", detectors: ["GATE_REGIME", "SR_BOUNCE", "PINBAR_AT_LEVEL"] },
  { id: "BOS_CHOCH_PINBAR", name: "BOS + CHOCH + PINBAR", detectors: ["GATE_REGIME", "BOS", "CHOCH", "PINBAR_AT_LEVEL"] },
  { id: "VOL_BOS_PINBAR", name: "Vol + BOS + PINBAR", detectors: ["GATE_REGIME", "GATE_VOLATILITY", "BOS", "PINBAR_AT_LEVEL"] },
  { id: "VOL_OB_ENGULF", name: "Vol + OB + ENGULF", detectors: ["GATE_REGIME", "GATE_VOLATILITY", "OB", "ENGULF_AT_LEVEL"] },
]

interface TradeEntry {
  timestamp: string
  direction: string
  entry: number
  sl: number
  tp: number
  rr: number
  outcome: string
}

interface SimResult {
  symbol: string
  strategyId: string
  strategyName: string
  detectors: string[]
  entries: number
  tp: number
  sl: number
  winrate: number
  trades: TradeEntry[]
}

async function runSimulation(
  symbol: string,
  strategy: TestStrategy,
  from: string,
  to: string
): Promise<SimResult | null> {
  const payload = {
    uid: "admin_backtest",
    requestId: `backtest_${Date.now()}`,
    strategyId: strategy.id,
    strategy_id: strategy.id,
    symbols: [symbol],
    from,
    to,
    timeframe: "15m",
    mode: "winrate",
    strategy: {
      id: strategy.id,
      name: strategy.name,
      detectors: strategy.detectors,
      detectorsRequested: strategy.detectors,
      detectorsNormalized: strategy.detectors,
      detectorsUnknown: [],
      symbols: [symbol],
      timeframe: "15m",
      config: { min_rr: 2.5 },
    },
    demoMode: true,
  }

  try {
    const response = await fetch(`${BACKEND_ORIGIN}/api/strategy-sim/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY!,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.ok) {
      return null
    }

    const summary = data.summary || data.combined?.summary || {}
    const trades: TradeEntry[] = []

    // Extract trade details
    if (data.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        trades.push({
          timestamp: entry.ts || entry.timestamp || "",
          direction: entry.direction || "BUY",
          entry: entry.entry || entry.entryPrice || 0,
          sl: entry.sl || entry.stopLoss || 0,
          tp: entry.tp || entry.takeProfit || 0,
          rr: entry.rr || 0,
          outcome: entry.outcome || "OPEN",
        })
      }
    }

    return {
      symbol,
      strategyId: strategy.id,
      strategyName: strategy.name,
      detectors: strategy.detectors,
      entries: summary.entries || 0,
      tp: summary.tp || 0,
      sl: summary.sl || 0,
      winrate: summary.winrate || 0,
      trades,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  if (!isValidKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "INTERNAL_API_KEY not configured" }, { status: 500 })
  }

  // Parse request body for custom date range
  let from: string
  let to: string

  try {
    const body = await request.json().catch(() => ({}))
    const today = new Date()
    to = body.to || today.toISOString().split("T")[0]

    if (body.from) {
      from = body.from
    } else {
      const fromDate = new Date(today)
      fromDate.setDate(fromDate.getDate() - 30)
      from = fromDate.toISOString().split("T")[0]
    }
  } catch {
    const today = new Date()
    to = today.toISOString().split("T")[0]
    const fromDate = new Date(today)
    fromDate.setDate(fromDate.getDate() - 30)
    from = fromDate.toISOString().split("T")[0]
  }

  console.log(`[find-60-winrate] Starting backtest: ${from} → ${to}`)
  console.log(`[find-60-winrate] Symbols: ${TARGET_SYMBOLS.join(", ")}`)
  console.log(`[find-60-winrate] Strategies: ${STRATEGIES_TO_TEST.length}`)

  const allResults: SimResult[] = []
  const winningCombos: SimResult[] = []
  const errors: string[] = []

  // Test each combination
  for (const symbol of TARGET_SYMBOLS) {
    for (const strategy of STRATEGIES_TO_TEST) {
      try {
        const result = await runSimulation(symbol, strategy, from, to)

        if (result) {
          allResults.push(result)

          if (result.entries >= MIN_TRADES && result.winrate >= MIN_WINRATE) {
            winningCombos.push(result)
            console.log(`[find-60-winrate] ✅ ${symbol} ${strategy.name}: ${result.winrate.toFixed(1)}% (${result.entries} trades)`)
          }
        }
      } catch (err: any) {
        errors.push(`${symbol} ${strategy.name}: ${err?.message}`)
      }

      // Small delay to avoid overwhelming backend
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  // Build response
  const response = {
    ok: true,
    dateRange: { from, to },
    symbols: TARGET_SYMBOLS,
    strategiesTested: STRATEGIES_TO_TEST.length,
    totalTests: TARGET_SYMBOLS.length * STRATEGIES_TO_TEST.length,

    // Winners (60%+)
    winning: winningCombos.map((w) => ({
      symbol: w.symbol,
      strategyName: w.strategyName,
      detectors: w.detectors.slice(1), // Exclude GATE_REGIME for clarity
      winrate: w.winrate,
      trades: w.entries,
      tp: w.tp,
      sl: w.sl,
      tradeDetails: w.trades,
    })),
    winningCount: winningCombos.length,

    // Best per symbol (even if < 60%)
    bestPerSymbol: TARGET_SYMBOLS.map((symbol) => {
      const symbolResults = allResults
        .filter((r) => r.symbol === symbol && r.entries >= MIN_TRADES)
        .sort((a, b) => b.winrate - a.winrate)

      if (symbolResults.length === 0) {
        return { symbol, best: null }
      }

      const best = symbolResults[0]
      return {
        symbol,
        best: {
          strategyName: best.strategyName,
          detectors: best.detectors.slice(1),
          winrate: best.winrate,
          trades: best.entries,
          tradeDetails: best.trades,
        },
      }
    }),

    errors: errors.length > 0 ? errors : undefined,
  }

  console.log(`[find-60-winrate] Complete. Winning: ${winningCombos.length}, Total tested: ${allResults.length}`)

  return NextResponse.json(response)
}
