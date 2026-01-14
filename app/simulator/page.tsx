"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  RotateCcw,
  Trash2,
  Settings2,
  Download,
  AlertTriangle,
  Target,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Pro UI Components
import {
  TerminalPanel,
  MetricCard,
  TradesTable,
  RRDistributionChart,
  EquityCurveChart,
  DetectorConfigModal,
  SimulationLoading,
} from "@/components/simulator"

// ============================================
// Types
// ============================================
interface SimulatorSummary {
  entries: number
  tp_hits: number
  sl_hits: number
  winrate: number
  avg_r: number
  profit_factor: number | null
  avg_duration_bars: number
  total_r: number
}

interface SimulatorTrade {
  entry_ts: number
  exit_ts: number
  direction: "BUY" | "SELL"
  entry: number
  sl: number
  tp: number
  outcome: "TP" | "SL"
  r: number
  duration_bars: number
  detector: string
}

interface SimulatorResult {
  ok: boolean
  symbol?: string
  timeframe?: string
  from_ts?: number
  to_ts?: number
  candle_count?: number
  strategy_id?: string
  summary?: SimulatorSummary
  trades?: SimulatorTrade[]
  warnings?: string[]
  error?: {
    code: string
    message: string
  }
}

interface Strategy {
  strategy_id: string
  name?: string
  detectors: string[]
}

interface Detector {
  name: string
  doc?: string
}

// ============================================
// Constants
// ============================================
const RANGE_PRESETS = [
  { value: "7D", label: "Last 7 days", days: 7 },
  { value: "30D", label: "Last 30 days", days: 30 },
  { value: "90D", label: "Last 90 days", days: 90 },
  { value: "6M", label: "Last 6 months", days: 180 },
  { value: "1Y", label: "Last 1 year", days: 365 },
]

const TIMEFRAMES = [
  { value: "M5", label: "M5" },
  { value: "M15", label: "M15" },
  { value: "H1", label: "H1" },
  { value: "H4", label: "H4" },
]

// ============================================
// Helpers
// ============================================
function getRangeDates(preset: string): { from: Date; to: Date } {
  const to = new Date()
  const range = RANGE_PRESETS.find((r) => r.value === preset)
  const days = range?.days || 30
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to }
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function exportTradesToCSV(
  trades: SimulatorTrade[],
  symbol: string,
  tf: string,
  from: Date,
  to: Date
): void {
  const headers = [
    "Entry Date",
    "Exit Date",
    "Direction",
    "Entry",
    "SL",
    "TP",
    "Outcome",
    "R",
    "Duration (bars)",
    "Detector",
  ]

  const rows = trades.map((t) => [
    new Date(t.entry_ts * 1000).toISOString(),
    new Date(t.exit_ts * 1000).toISOString(),
    t.direction,
    t.entry,
    t.sl,
    t.tp,
    t.outcome,
    t.r.toFixed(2),
    t.duration_bars,
    t.detector,
  ])

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute(
    "download",
    `backtest_${symbol}_${tf}_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ============================================
// Page Component
// ============================================
export default function SimulatorPage() {
  const { toast } = useToast()

  // Data state
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [detectors, setDetectors] = useState<Detector[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulatorResult | null>(null)

  // Form state
  const [symbol, setSymbol] = useState("")
  const [timeframe, setTimeframe] = useState("M15")
  const [strategyId, setStrategyId] = useState("")
  const [rangePreset, setRangePreset] = useState("30D")

  // Modal state
  const [detectorModalOpen, setDetectorModalOpen] = useState(false)

  // Computed
  const selectedStrategy = strategies.find((s) => s.strategy_id === strategyId)
  const activeDetectors = selectedStrategy?.detectors || []
  const rangeDates = useMemo(() => getRangeDates(rangePreset), [rangePreset])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [symbolsRes, strategiesRes, detectorsRes] = await Promise.all([
        api.simulator.symbols().catch(() => ({ ok: false, symbols: [] })),
        api.strategies().catch(() => ({ strategies: [] })),
        api.detectors().catch(() => ({ detectors: [] })),
      ])

      if (symbolsRes.ok && symbolsRes.symbols) {
        setSymbols(symbolsRes.symbols)
        if (symbolsRes.symbols.length > 0 && !symbol) {
          setSymbol(symbolsRes.symbols[0])
        }
      }

      if (strategiesRes.strategies) {
        setStrategies(strategiesRes.strategies)
        if (strategiesRes.strategies.length > 0 && !strategyId) {
          setStrategyId(strategiesRes.strategies[0].strategy_id)
        }
      }

      if (detectorsRes.detectors) {
        setDetectors(detectorsRes.detectors)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load initial data")
    } finally {
      setLoading(false)
    }
  }

  async function runSimulation() {
    if (!symbol || !strategyId) {
      setError("Please select a symbol and strategy")
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.simulator.run({
        symbol,
        timeframe,
        strategy_id: strategyId,
        range: {
          mode: "PRESET",
          preset: rangePreset as "7D" | "30D" | "90D" | "6M" | "1Y",
        },
        assumptions: {
          intrabar_policy: "SL_FIRST",
          max_trades: 500,
        },
      })

      setResult(res)

      if (!res.ok && res.error) {
        setError(res.error.message)
      }
    } catch (err: any) {
      setError(err.message || "Simulation failed")
    } finally {
      setRunning(false)
    }
  }

  function clearResults() {
    setResult(null)
    setError(null)
  }

  function handleExportCSV() {
    if (!result?.trades || result.trades.length === 0) return
    exportTradesToCSV(
      result.trades,
      result.symbol || symbol,
      result.timeframe || timeframe,
      rangeDates.from,
      rangeDates.to
    )
    toast({
      title: "Downloaded",
      description: `Exported ${result.trades.length} trades to CSV`,
    })
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen bg-[#0A0E27] text-[#F0F4FF]">
      <div className="container mx-auto px-5 py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-[32px] md:text-[40px] font-bold uppercase tracking-tight">
            Strategy Simulator
          </h1>
          <p className="text-sm text-[#A0A8C0]">
            Backtest your trading strategy on historical data to evaluate
            performance before going live.
          </p>
        </div>

        {/* Configuration Panel */}
        <TerminalPanel
          title="Backtest Configuration"
          subtitle="Select your parameters and run simulation"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Symbol */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
                Symbol
              </label>
              <Select value={symbol} onValueChange={setSymbol} disabled={loading}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2749] text-[#F0F4FF] h-11">
                  <SelectValue placeholder="Select symbol..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1229] border-[#1E2749]">
                  {symbols.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-[#F0F4FF] focus:bg-[#1E2749] focus:text-[#F0F4FF]"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#6C7BA8]">Trading instrument</p>
            </div>

            {/* Timeframe */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
                Timeframe
              </label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2749] text-[#F0F4FF] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1229] border-[#1E2749]">
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem
                      key={tf.value}
                      value={tf.value}
                      className="text-[#F0F4FF] focus:bg-[#1E2749] focus:text-[#F0F4FF]"
                    >
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#6C7BA8]">Candle timeframe</p>
            </div>

            {/* Strategy */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
                Strategy
              </label>
              <Select value={strategyId} onValueChange={setStrategyId} disabled={loading}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2749] text-[#F0F4FF] h-11">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1229] border-[#1E2749]">
                  {strategies.map((s) => (
                    <SelectItem
                      key={s.strategy_id}
                      value={s.strategy_id}
                      className="text-[#F0F4FF] focus:bg-[#1E2749] focus:text-[#F0F4FF]"
                    >
                      {s.name || s.strategy_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#6C7BA8]">Your strategy preset</p>
            </div>

            {/* Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
                Date Range
              </label>
              <Select value={rangePreset} onValueChange={setRangePreset}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2749] text-[#F0F4FF] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1229] border-[#1E2749]">
                  {RANGE_PRESETS.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      className="text-[#F0F4FF] focus:bg-[#1E2749] focus:text-[#F0F4FF]"
                    >
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#6C7BA8]">
                {formatDateShort(rangeDates.from)} → {formatDateShort(rangeDates.to)}
              </p>
            </div>
          </div>

          {/* Active Detectors */}
          <div className="mt-6 pt-5 border-t border-[#1E2749]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
                Active Detectors
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetectorModalOpen(true)}
                className="text-xs text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 h-7 px-2"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Configure detectors...
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeDetectors.length > 0 ? (
                activeDetectors.map((d) => (
                  <Badge
                    key={d}
                    variant="outline"
                    className="bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6] text-xs px-2.5 py-1"
                  >
                    {d}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-[#6C7BA8]">
                  No detectors configured. Select a strategy or configure manually.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-5 border-t border-[#1E2749] flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={clearResults}
              disabled={running || !result}
              className="border-[#1E2749] text-[#A0A8C0] hover:bg-[#1E2749] hover:text-[#F0F4FF] h-10 px-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={runSimulation}
              disabled={running || !symbol || !strategyId}
              className={cn(
                "bg-[#3B82F6] hover:bg-[#2563EB] text-white h-10 px-6 font-semibold uppercase tracking-wide",
                "transition-all duration-150 hover:scale-[1.02]"
              )}
            >
              <RotateCcw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
              {running ? "Simulating..." : "Simulate"}
            </Button>
          </div>
        </TerminalPanel>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-[#FF4757]/30 bg-[#FF4757]/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#FF4757] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-[#FF4757] mb-1">
                  Simulation Error
                </h4>
                <p className="text-xs text-[#A0A8C0]">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {running && (
          <SimulationLoading
            symbol={symbol}
            timeframe={timeframe}
            candleCount={result?.candle_count}
          />
        )}

        {/* Results */}
        {result?.ok && result.summary && !running && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold uppercase tracking-wide text-[#F0F4FF]">
                  Simulation Results
                </h2>
                <p className="text-xs text-[#6C7BA8] mt-0.5">
                  {result.symbol} • {result.timeframe} •{" "}
                  {formatDateShort(rangeDates.from)} → {formatDateShort(rangeDates.to)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={!result.trades?.length}
                className="border-[#1E2749] text-[#A0A8C0] hover:bg-[#1E2749] hover:text-[#F0F4FF] h-9"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Trades"
                value={result.summary.entries}
                tooltip="Total number of trade entries generated"
              />
              <MetricCard
                label="Win Rate"
                value={
                  result.summary.entries > 0
                    ? `${result.summary.winrate.toFixed(1)}%`
                    : "N/A"
                }
                subValue={
                  result.summary.entries === 0
                    ? "(0 closed trades)"
                    : `${result.summary.tp_hits}W / ${result.summary.sl_hits}L`
                }
                variant={result.summary.winrate >= 50 ? "success" : "danger"}
                tooltip="Percentage of trades hitting TP"
              />
              <MetricCard
                label="Total Profit"
                value={`${result.summary.total_r >= 0 ? "+" : ""}${result.summary.total_r.toFixed(1)}R`}
                variant={result.summary.total_r >= 0 ? "success" : "danger"}
                trend={result.summary.total_r >= 0 ? "up" : "down"}
                tooltip="Total cumulative R (risk units)"
              />
              <MetricCard
                label="Profit Factor"
                value={
                  result.summary.profit_factor !== null
                    ? result.summary.profit_factor.toFixed(2)
                    : "—"
                }
                subValue={result.summary.profit_factor === null ? "(no losses)" : undefined}
                variant={
                  result.summary.profit_factor && result.summary.profit_factor >= 1.5
                    ? "success"
                    : result.summary.profit_factor && result.summary.profit_factor < 1
                    ? "danger"
                    : "default"
                }
                tooltip="Gross profit / Gross loss ratio"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* RR Distribution */}
              <TerminalPanel
                title="R:R Distribution"
                subtitle="Trade outcome distribution by R value"
                className="lg:col-span-1"
              >
                <RRDistributionChart trades={result.trades || []} />
              </TerminalPanel>

              {/* Equity Curve */}
              <TerminalPanel
                title="Equity Curve"
                subtitle="Cumulative performance over time"
                className="lg:col-span-2"
              >
                <EquityCurveChart trades={result.trades || []} />
              </TerminalPanel>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="rounded-lg border border-[#FFA502]/30 bg-[#FFA502]/10 p-4">
                <h4 className="text-sm font-medium text-[#FFA502] mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </h4>
                <ul className="text-xs text-[#A0A8C0] space-y-1 list-disc list-inside">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trades Table */}
            <TerminalPanel
              title={`Trade History (${result.trades?.length || 0})`}
              subtitle="Individual trade entries and outcomes"
            >
              <TradesTable trades={result.trades || []} />
            </TerminalPanel>
          </div>
        )}

        {/* Empty State */}
        {!result && !running && !error && (
          <div className="rounded-lg border border-[#1E2749] bg-[#0D1229] p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#1E2749] flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F0F4FF] mb-2">
                Ready to Simulate
              </h3>
              <p className="text-sm text-[#A0A8C0] mb-6">
                Configure your backtest parameters above and click{" "}
                <span className="text-[#3B82F6] font-medium">SIMULATE</span> to
                analyze your strategy&apos;s historical performance.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#6C7BA8]">
                <ChevronRight className="h-4 w-4" />
                <span>
                  Tip: Start with a 30-day period to get quick results
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detector Config Modal */}
      <DetectorConfigModal
        open={detectorModalOpen}
        onOpenChange={setDetectorModalOpen}
        detectors={detectors}
        selectedDetectors={activeDetectors}
        onSave={() => {
          toast({
            title: "Detector Configuration",
            description: "Detector customization will be available in a future update.",
          })
        }}
        readOnly
      />
    </div>
  )
}
