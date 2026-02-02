/**
 * POST /api/admin/quick-backtest
 *
 * Quick backtest - 5 strategies x 1 symbol
 * Use ?symbol=EURUSD to specify symbol
 *
 * Requires x-internal-api-key header
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 120 // 2 minutes

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

function isValidKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key")
  return !!key && !!INTERNAL_API_KEY && key === INTERNAL_API_KEY
}

interface TestStrategy {
  id: string
  name: string
  detectors: string[]
}

// Top 10 strategies to test (proven combinations)
const STRATEGIES: TestStrategy[] = [
  { id: "BOS_PINBAR", name: "BOS + PINBAR", detectors: ["GATE_REGIME", "BOS", "PINBAR_AT_LEVEL"] },
  { id: "CHOCH_PINBAR", name: "CHOCH + PINBAR", detectors: ["GATE_REGIME", "CHOCH", "PINBAR_AT_LEVEL"] },
  { id: "OB_ENGULF", name: "OB + ENGULF", detectors: ["GATE_REGIME", "OB", "ENGULF_AT_LEVEL"] },
  { id: "SWEEP_PINBAR", name: "SWEEP + PINBAR", detectors: ["GATE_REGIME", "SWEEP", "PINBAR_AT_LEVEL"] },
  { id: "BREAK_RETEST", name: "Break & Retest", detectors: ["GATE_REGIME", "BREAK_RETEST"] },
  { id: "SR_BOUNCE_PINBAR", name: "S/R Bounce + PINBAR", detectors: ["GATE_REGIME", "SR_BOUNCE", "PINBAR_AT_LEVEL"] },
  { id: "BOS_FVG", name: "BOS + FVG", detectors: ["GATE_REGIME", "BOS", "FVG"] },
  { id: "OB_PINBAR", name: "OB + PINBAR", detectors: ["GATE_REGIME", "OB", "PINBAR_AT_LEVEL"] },
  { id: "SFP_PINBAR", name: "SFP + PINBAR", detectors: ["GATE_REGIME", "SFP", "PINBAR_AT_LEVEL"] },
  { id: "VOL_BOS_PINBAR", name: "Vol + BOS + PINBAR", detectors: ["GATE_REGIME", "GATE_VOLATILITY", "BOS", "PINBAR_AT_LEVEL"] },
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

async function runSimulation(
  symbol: string,
  strategy: TestStrategy,
  from: string,
  to: string
): Promise<{
  ok: boolean
  strategyName: string
  detectors: string[]
  entries: number
  tp: number
  sl: number
  winrate: number
  trades: TradeEntry[]
} | null> {
  const payload = {
    uid: "admin_backtest",
    requestId: `bt_${Date.now()}`,
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
      ok: true,
      strategyName: strategy.name,
      detectors: strategy.detectors.slice(1), // Exclude GATE_REGIME
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
  if (!isValidKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "INTERNAL_API_KEY not configured" }, { status: 500 })
  }

  // Get symbol from query param or body
  const { searchParams } = new URL(request.url)
  const querySymbol = searchParams.get("symbol")

  let symbol = "EURUSD" // default
  let from: string
  let to: string

  try {
    const body = await request.json().catch(() => ({}))
    symbol = body.symbol || querySymbol || "EURUSD"

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

  console.log(`[quick-backtest] ${symbol}: ${from} → ${to}`)

  const results: Array<{
    strategyName: string
    detectors: string[]
    winrate: number
    trades: number
    tp: number
    sl: number
    tradeDetails: TradeEntry[]
  }> = []

  for (const strategy of STRATEGIES) {
    const result = await runSimulation(symbol, strategy, from, to)

    if (result && result.entries > 0) {
      results.push({
        strategyName: result.strategyName,
        detectors: result.detectors,
        winrate: result.winrate,
        trades: result.entries,
        tp: result.tp,
        sl: result.sl,
        tradeDetails: result.trades,
      })
    }

    // Small delay
    await new Promise((r) => setTimeout(r, 100))
  }

  // Sort by winrate
  results.sort((a, b) => b.winrate - a.winrate)

  const winners = results.filter((r) => r.winrate >= 60 && r.trades >= 3)
  const best = results.length > 0 ? results[0] : null

  return NextResponse.json({
    ok: true,
    symbol,
    dateRange: { from, to },
    strategiesTested: STRATEGIES.length,

    // Best strategy
    best: best
      ? {
          strategyName: best.strategyName,
          detectors: best.detectors,
          winrate: best.winrate,
          trades: best.trades,
          tp: best.tp,
          sl: best.sl,
          tradeDetails: best.tradeDetails,
        }
      : null,

    // 60%+ winners
    winners,
    winnersCount: winners.length,

    // All results
    allResults: results,
  })
}
