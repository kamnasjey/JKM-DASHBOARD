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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RotateCcw,
  Trash2,
  Download,
  AlertTriangle,
  Target,
  Layers,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
  DETECTOR_BY_ID, 
  CATEGORY_INFO, 
  type DetectorCategory 
} from "@/lib/detectors/catalog"
import { ZeroTradesDebugPanel } from "@/components/simulator/zero-trades-debug-panel"
import { DiagnosticsPanel } from "@/components/simulator/diagnostics-panel"
import { ErrorBoundary } from "@/components/error-boundary"
import { TradesTable } from "@/components/simulator/trades-table"
import { LiveTradesStream } from "@/components/simulator/live-trades-stream"

// ============================================
// Types
// ============================================
interface TFSummary {
  entries: number
  tp: number
  sl: number
  open: number
  timeExit?: number
  winrate: number
  error?: string
}

interface TFResult {
  summary: TFSummary
  byHorizon?: {
    intraday: TFSummary
    swing: TFSummary
  }
  insights?: any
  suggestions?: any[]
  error?: string
}

interface TagInsight {
  tag: string
  shareTotal: number
  tp: number
  sl: number
  winrate: number
  tfCount?: number
}

interface TradeDetail {
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
  symbol?: string
  tf?: string // 5m, 15m, 30m, 1h, 4h
}

// Helper: Convert bars to human readable duration
function formatDuration(bars: number, tf?: string): string {
  // Map timeframe to minutes per bar
  const tfMinutes: Record<string, number> = {
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
  }
  const minutesPerBar = tf ? (tfMinutes[tf] || 15) : 15
  const totalMinutes = bars * minutesPerBar
  
  if (totalMinutes < 60) {
    return `${totalMinutes}мин`
  } else if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return mins > 0 ? `${hours}ц ${mins}мин` : `${hours}ц`
  } else {
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    return hours > 0 ? `${days}ө ${hours}ц` : `${days}ө`
  }
}

interface MultiTFResult {
  ok: boolean
  trades?: TradeDetail[]  // Per-trade details from mode="detailed"
  combined?: {
    summary: TFSummary
    tagsAny: TagInsight[]
    tagsPrimary: TagInsight[]
    tradesSample: any[]
    bestTf?: string
    bestWinrate?: number
  }
  byTimeframe?: Record<string, TFResult>
  explainability?: {
    rootCause: string
    explanation: string
    severity?: string
    suggestions?: string[]
    debug?: {
      barsScanned?: number
      hitsPerDetector?: Record<string, number>
      gateBlocks?: Record<string, number>
      detectorsRequested?: string[]
      detectorsNormalized?: string[]
      detectorsImplemented?: string[]
      detectorsNotImplemented?: string[]
      detectorsUnknown?: string[]
    }
    debugInfo?: {
      detectorsRequested?: string[]
      detectorsImplemented?: string[]
      detectorsNotImplemented?: string[]
      detectorsUnknown?: string[]
      timeframesRan?: string[]
      tfExplainability?: any[]
    }
  }
  meta?: {
    simVersion?: string
    dashboardVersion?: string
    timeframesRan: string[]
    dataSource: string | {
      source?: string
      hasData?: boolean
      candleCount?: number
      firstTs?: string | null
      lastTs?: string | null
      coveragePct?: number
      missingRanges?: any[]
      rootCause?: string | null
      suggestion?: string | null
    }
    range: { from: string; to: string }
    symbols: string[]
    warnings: (string | object)[]
    // Detector classification for UI transparency
    detectorsRequested?: string[]
    detectorsNormalized?: string[]
    detectorsRecognized?: string[]
    detectorsImplemented?: string[]
    detectorsNotImplemented?: string[]
    detectorsUnknown?: string[]
  }
  error?: {
    code: string
    message: string
  }
}

interface Strategy {
  id: string  // Changed from strategy_id for Firestore v2 API
  name?: string
  detectors: string[]
  symbols?: string[]
  timeframe?: string
  config?: Record<string, any>
}

// ============================================
// Constants
// ============================================
const RANGE_PRESETS = [
  { value: "7D", label: "7 Days", days: 7 },
  { value: "30D", label: "30 Days", days: 30 },
  { value: "90D", label: "90 Days", days: 90 },
  { value: "6M", label: "6 Months", days: 180 },
  { value: "1Y", label: "1 Year", days: 365 },
]

const TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h"]

const GAP_ERROR_PATTERN = /missing bars|data quality|gaps|demoMode=true/i

function normalizeMessage(input: unknown): string {
  if (typeof input === "string") return input
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>
    const message = record.message ?? record.reasonText ?? record.suggestion ?? record.rootCause
    if (typeof message === "string") return message
    return JSON.stringify(input)
  }
  return String(input)
}

// ============================================
// Helpers
// ============================================
function getRangeDates(preset: string): { from: string; to: string } {
  const to = new Date()
  const range = RANGE_PRESETS.find((r) => r.value === preset)
  const days = range?.days || 30
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  }
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function isGapError(res: any): boolean {
  const message = res?.error?.message || ""
  return GAP_ERROR_PATTERN.test(message)
}

function addDemoWarning(res: any, warning: string): any {
  const meta = res?.meta || {}
  const warnings = Array.isArray(meta.warnings) ? meta.warnings : []
  return {
    ...res,
    meta: {
      ...meta,
      warnings: [...warnings, warning],
    },
  }
}

// ============================================
// Components
// ============================================
function MetricCard({
  label,
  value,
  subValue,
  trend,
  className,
}: {
  label: string
  value: string | number
  subValue?: string
  trend?: "up" | "down" | "neutral"
  className?: string
}) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <span
              className={cn(
                "text-xs",
                trend === "up" && "text-green-500",
                trend === "down" && "text-red-500"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : trend === "down" ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
            </span>
          )}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  )
}

function TFTab({
  tf,
  result,
  isActive,
}: {
  tf: string
  result?: TFResult
  isActive: boolean
}) {
  const winrate = result?.summary?.winrate ?? 0
  const entries = result?.summary?.entries ?? 0
  const hasError = !!result?.error

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{tf.toUpperCase()}</span>
      {hasError ? (
        <Badge variant="destructive" className="text-[10px] px-1.5">
          ERR
        </Badge>
      ) : entries > 0 ? (
        <Badge
          variant={winrate >= 55 ? "default" : winrate >= 45 ? "secondary" : "destructive"}
          className={cn(
            "text-[10px] px-1.5",
            winrate >= 55 && "bg-green-500/20 text-green-400 border-green-500/30"
          )}
        >
          {winrate.toFixed(0)}%
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
          0
        </Badge>
      )}
    </div>
  )
}

function TagAttributionTable({ tags }: { tags: TagInsight[] }) {
  if (!tags || tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No tag data available
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-2 font-medium">Tag</th>
            <th className="text-right py-2 font-medium">Trades</th>
            <th className="text-right py-2 font-medium">TP</th>
            <th className="text-right py-2 font-medium">SL</th>
            <th className="text-right py-2 font-medium">Winrate</th>
          </tr>
        </thead>
        <tbody>
          {tags.slice(0, 10).map((tag, idx) => (
            <tr key={idx} className="border-b border-border/50 last:border-0">
              <td className="py-2">
                <Badge variant="outline" className="text-xs">
                  {tag.tag}
                </Badge>
              </td>
              <td className="text-right py-2 text-muted-foreground">
                {tag.shareTotal || tag.tp + tag.sl}
              </td>
              <td className="text-right py-2 text-green-500">{tag.tp}</td>
              <td className="text-right py-2 text-red-500">{tag.sl}</td>
              <td className="text-right py-2">
                <span
                  className={cn(
                    "font-medium",
                    tag.winrate >= 55 && "text-green-500",
                    tag.winrate < 45 && "text-red-500"
                  )}
                >
                  {tag.winrate.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// Page Component
// ============================================
export default function SimulatorPage() {
  const { toast } = useToast()

  // Data state
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MultiTFResult | null>(null)

  // Form state
  const [symbol, setSymbol] = useState("")
  const [strategyId, setStrategyId] = useState("")
  const [rangePreset, setRangePreset] = useState("30D")
  
  // Result tabs
  const [activeTab, setActiveTab] = useState("combined")
  
  // Streaming simulation state
  const [streamingTrades, setStreamingTrades] = useState<Array<{
    id: string
    entry_ts: number
    exit_ts?: number
    direction: "BUY" | "SELL"
    entry: number
    sl: number
    tp: number
    outcome?: "TP" | "SL" | "PENDING"
    r?: number
    duration_bars?: number
    detector: string
    status: "entering" | "waiting" | "resolved"
  }>>([])

  // Computed
  const selectedStrategy = strategies.find((s) => s.id === strategyId)
  const requestedDetectors = selectedStrategy?.detectors || []
  const rangeDates = useMemo(() => getRangeDates(rangePreset), [rangePreset])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [symbolsRes, strategiesRes] = await Promise.all([
        api.simulator.symbols().catch(() => ({ ok: false, symbols: [] })),
        api.strategiesV2.list().catch(() => ({ ok: false, strategies: [] })),  // Use Firestore v2 API
      ])

      if (symbolsRes.ok && symbolsRes.symbols) {
        setSymbols(symbolsRes.symbols)
        if (symbolsRes.symbols.length > 0 && !symbol) {
          setSymbol(symbolsRes.symbols[0])
        }
      }

      if (strategiesRes.strategies) {
        // Debug: log all strategies to see their IDs
        console.log("[simulator] Raw strategies from API:", strategiesRes.strategies.map((s: any) => ({ id: s.id, name: s.name })))

        // Filter out strategies with invalid/empty IDs to prevent Select issues
        const validStrategies = strategiesRes.strategies.filter(
          (s: Strategy) => s.id && typeof s.id === "string" && s.id.trim() !== ""
        )

        console.log("[simulator] Valid strategies after filter:", validStrategies.map((s: Strategy) => ({ id: s.id, name: s.name })))

        setStrategies(validStrategies)
        if (validStrategies.length > 0 && !strategyId) {
          console.log("[simulator] Auto-selecting first strategy:", validStrategies[0].id)
          setStrategyId(validStrategies[0].id)  // Use 'id' for Firestore v2
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load initial data")
    } finally {
      setLoading(false)
    }
  }

  // Sanitize trade object - extract only the needed primitive fields
  function sanitizeTrade(trade: any): TradeDetail | null {
    if (!trade || typeof trade !== "object") return null
    // Only extract primitive fields to avoid rendering objects
    const entry_ts = typeof trade.entry_ts === "number" ? trade.entry_ts : 0
    const exit_ts = typeof trade.exit_ts === "number" ? trade.exit_ts : 0
    const direction = trade.direction === "BUY" || trade.direction === "SELL" ? trade.direction : "BUY"
    const entry = typeof trade.entry === "number" ? trade.entry : 0
    const sl = typeof trade.sl === "number" ? trade.sl : 0
    const tp = typeof trade.tp === "number" ? trade.tp : 0
    const outcome = trade.outcome === "TP" || trade.outcome === "SL" ? trade.outcome : "SL"
    const r = typeof trade.r === "number" ? trade.r : 0
    const duration_bars = typeof trade.duration_bars === "number" ? trade.duration_bars : 0
    const detector = typeof trade.detector === "string" ? trade.detector : "unknown"
    const symbol = typeof trade.symbol === "string" ? trade.symbol : undefined
    const tf = typeof trade.tf === "string" ? trade.tf : undefined
    
    return { entry_ts, exit_ts, direction, entry, sl, tp, outcome, r, duration_bars, detector, symbol, tf }
  }

  // Animate trades streaming effect
  async function animateTradesStream(trades: TradeDetail[]) {
    if (!trades || trades.length === 0) return
    
    setStreamingTrades([])
    
    // Sanitize and sort by entry time
    const sanitizedTrades = trades
      .map(sanitizeTrade)
      .filter((t): t is TradeDetail => t !== null)
      .sort((a, b) => a.entry_ts - b.entry_ts)
    
    for (let i = 0; i < sanitizedTrades.length; i++) {
      const trade = sanitizedTrades[i]
      
      // Add trade as "entering" - only use sanitized primitive fields
      setStreamingTrades(prev => [
        ...prev,
        {
          id: `trade-${i}`,
          entry_ts: trade.entry_ts,
          exit_ts: trade.exit_ts,
          direction: trade.direction,
          entry: trade.entry,
          sl: trade.sl,
          tp: trade.tp,
          r: trade.r,
          duration_bars: trade.duration_bars,
          detector: trade.detector,
          symbol: trade.symbol,
          tf: trade.tf,
          outcome: "PENDING" as const,
          status: "entering" as const,
        },
      ])
      
      // Wait a bit then change to "waiting"
      await new Promise(r => setTimeout(r, 150))
      
      setStreamingTrades(prev =>
        prev.map((t, idx) =>
          idx === i ? { ...t, status: "waiting" as const } : t
        )
      )
      
      // Wait then resolve
      await new Promise(r => setTimeout(r, 300))
      
      setStreamingTrades(prev =>
        prev.map((t, idx) =>
          idx === i
            ? { ...t, outcome: trade.outcome, status: "resolved" as const, r: trade.r }
            : t
        )
      )
      
      // Small delay between trades
      await new Promise(r => setTimeout(r, 100))
    }
  }

  async function runSimulation() {
    // Debug logging
    console.log("[simulator] runSimulation called with:", { symbol, strategyId, strategiesCount: strategies.length })
    console.log("[simulator] Current strategies in state:", strategies.map(s => ({ id: s.id, name: s.name })))

    if (!symbol) {
      setError("Please select a symbol")
      return
    }
    if (!strategyId || strategyId.trim() === "") {
      console.error("[simulator] strategyId is empty!", { strategyId })
      setError("Please select a strategy. If no strategies appear, create one on the Strategies page first.")
      return
    }
    // Verify selected strategy still exists in loaded list
    const strategy = strategies.find(s => s.id === strategyId)
    if (!strategy) {
      console.error("[simulator] Strategy not found in list!", { strategyId, availableIds: strategies.map(s => s.id) })
      setError(`Selected strategy not found. Please refresh and try again.`)
      return
    }
    console.log("[simulator] Found strategy:", { id: strategy.id, name: strategy.name })

    // Check if strategy has detectors
    if (!strategy.detectors || strategy.detectors.length === 0) {
      setError("This strategy has no detectors configured. Please edit the strategy in the Strategies page and add at least one detector.")
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setStreamingTrades([])
    setActiveTab("combined")

    try {
      // Call v2 API which loads strategy from Firestore and proxies to backend
      const requestPayload = {
        strategyId,
        symbols: [symbol],
        from: rangeDates.from,
        to: rangeDates.to,
        timeframe: "auto",  // Let backend decide TF based on range
        mode: "winrate",
        demoMode: false,
      }
      console.log("[simulator] API request payload:", JSON.stringify(requestPayload, null, 2))
      console.log("[simulator] strategyId value:", strategyId, "type:", typeof strategyId, "length:", strategyId?.length)

      const res = await api.simulatorV2.run(requestPayload)

      if (!res.ok && isGapError(res)) {
        const demoRes = await api.simulatorV2.run({
          strategyId,
          symbols: [symbol],
          from: rangeDates.from,
          to: rangeDates.to,
          timeframe: "auto",
          mode: "winrate",
          demoMode: true,
        })
        const warning = "Data quality issue detected. Ran in demo mode with gaps allowed."
        const patched = addDemoWarning(demoRes, warning)

        // Extract trades from multiple possible locations (single-TF vs multi-TF response)
        const patchedTrades = patched.trades || patched.combined?.tradesSample || []
        const normalizedPatched = { ...patched, trades: patchedTrades } as MultiTFResult

        setResult(normalizedPatched)
        if (!normalizedPatched.ok && normalizedPatched.error) {
          setError(normalizeMessage(normalizedPatched.error))
        }
        // Animate trades if available
        if (patchedTrades.length > 0) {
          animateTradesStream(patchedTrades)
        }
        return
      }

      // Extract trades from multiple possible locations (single-TF vs multi-TF response)
      const trades = res.trades || res.combined?.tradesSample || []
      const normalizedRes = { ...res, trades } as MultiTFResult

      setResult(normalizedRes)

      // Animate trades if available
      if (trades.length > 0) {
        animateTradesStream(trades)
      }

      if (!res.ok && res.error) {
        setError(normalizeMessage(res.error))
      }
    } catch (err: any) {
      setError(normalizeMessage(err?.message || "Simulation failed"))
    } finally {
      setRunning(false)
    }
  }

  function clearResults() {
    setResult(null)
    setError(null)
    setStreamingTrades([])
  }

  // Quick fix handlers for 0 trades debugging
  async function handleQuickFix(action: "normalize" | "extend_range" | "change_tf" | "disable_gates") {
    if (!symbol || !strategyId) return

    setRunning(true)
    setError(null)
    setResult(null)
    setActiveTab("combined")

    try {
      let customFrom = rangeDates.from
      let customTo = rangeDates.to
      let customTimeframe = "auto"
      let customDetectors: string[] | undefined

      switch (action) {
        case "extend_range":
          // Set to 90 days
          const to90 = new Date()
          const from90 = new Date(to90.getTime() - 90 * 24 * 60 * 60 * 1000)
          customFrom = from90.toISOString().split("T")[0]
          customTo = to90.toISOString().split("T")[0]
          setRangePreset("90D")
          break

        case "change_tf":
          // Backend now automatically uses multi-TF mode with "auto"
          // No need for comma-separated format - auto handles all TFs
          customTimeframe = "auto"
          break

        case "disable_gates":
          // Filter out gate detectors for this run only
          const strategyDetectors = selectedStrategy?.detectors || []
          customDetectors = strategyDetectors.filter(d =>
            !d.startsWith("GATE_") || d === "GATE_REGIME"
          )
          break

        case "normalize":
          // Just re-run, normalization happens on server
          break
      }

      const quickFixPayload = {
        strategyId,
        symbols: [symbol],
        from: customFrom,
        to: customTo,
        timeframe: customTimeframe as "auto" | "5m" | "15m" | "1h" | "4h" | "1d",
        mode: "winrate",
        demoMode: false,
      }
      console.log("[simulator] QuickFix API payload:", JSON.stringify(quickFixPayload, null, 2))
      console.log("[simulator] QuickFix strategyId:", strategyId, "type:", typeof strategyId)

      const res = await api.simulatorV2.run(quickFixPayload)

      if (!res.ok && isGapError(res)) {
        const demoRes = await api.simulatorV2.run({
          strategyId,
          symbols: [symbol],
          from: customFrom,
          to: customTo,
          timeframe: customTimeframe as "auto" | "5m" | "15m" | "1h" | "4h" | "1d",
          mode: "winrate",
          demoMode: true,
        })
        const warning = "Data quality issue detected. Ran in demo mode with gaps allowed."
        const patched = addDemoWarning(demoRes, warning)

        // Extract trades from multiple possible locations (single-TF vs multi-TF response)
        const patchedTrades = patched.trades || patched.combined?.tradesSample || []
        const normalizedPatched = { ...patched, trades: patchedTrades } as MultiTFResult

        setResult(normalizedPatched)
        if (!normalizedPatched.ok && normalizedPatched.error) {
          setError(normalizeMessage(normalizedPatched.error))
        }
        return
      }

      // Extract trades from multiple possible locations (single-TF vs multi-TF response)
      const trades = res.trades || res.combined?.tradesSample || []
      const normalizedRes = { ...res, trades } as MultiTFResult

      setResult(normalizedRes)

      if (!normalizedRes.ok && normalizedRes.error) {
        setError(normalizeMessage(normalizedRes.error))
      }
    } catch (err: any) {
      setError(normalizeMessage(err?.message || "Quick fix simulation failed"))
    } finally {
      setRunning(false)
    }
  }

  // ============================================
  // Render
  // ============================================

      // Extract version from result meta
      const simVersion = result?.meta?.simVersion || ""
      const dashboardVersion = result?.meta?.dashboardVersion || ""
      
      // Universal safe string converter - prevents React #31 error
      const safeString = (input: any): string => {
        if (input === null || input === undefined) return ""
        if (typeof input === "string") return input
        if (typeof input === "number" || typeof input === "boolean") return String(input)
        if (input && typeof input === "object") {
          // Try to extract a message field from common patterns
          const msg = input.message || input.suggestion || input.title || input.reasonText || input.rootCause || input.error
          if (typeof msg === "string") return msg
          // Fallback to JSON but truncate for display
          const json = JSON.stringify(input)
          return json.length > 100 ? json.slice(0, 100) + "..." : json
        }
        return String(input)
      }
      
      const formatSuggestion = (input: any) => safeString(input)
      const formatWarning = (input: any) => safeString(input)
      const combinedResult = result?.combined || (result?.summary ? {
        summary: result.summary,
        bestTf: undefined,
        bestWinrate: undefined,
        tagsAny: [],
        tagsPrimary: [],
        tradesSample: [],
      } : undefined)
      const isNoSetups = !!combinedResult && (combinedResult.summary?.entries ?? 0) === 0

      return (
        <ErrorBoundary
          fallback={
            <div className="min-h-screen bg-background text-foreground">
              <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Card>
                  <CardContent className="py-10 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
                    <p className="text-sm text-muted-foreground">Simulator хэсэг алдаа гарлаа.</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                      Дахин ачаалах
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          }
        >
          <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
              {process.env.NODE_ENV !== "production" && (
                <div className="hidden" aria-hidden>
                  {formatWarning({
                    source: "mock",
                    hasData: false,
                    candleCount: 0,
                    firstTs: null,
                    lastTs: null,
                    coveragePct: 0,
                    missingRanges: [],
                    rootCause: "NO_DATA",
                    suggestion: "Extend range",
                  })}
                </div>
              )}
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Strategy Simulator
                </h1>
                <p className="text-muted-foreground mt-1">
                  Multi-timeframe backtesting across 5m → 4h
                </p>
                {/* Version info */}
                {(simVersion || dashboardVersion) && (
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                    {dashboardVersion && `dash:${dashboardVersion}`}
                    {dashboardVersion && simVersion && " • "}
                    {simVersion && `sim:${simVersion}`}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Multi-TF Auto
              </Badge>
            </div>

            {/* Configuration Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>
              Select your symbol, strategy, and date range. All timeframes run automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Symbol */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Select value={symbol} onValueChange={setSymbol} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select symbol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {symbols.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Strategy</label>
                <Select
                  value={strategyId}
                  onValueChange={(value) => {
                    console.log("[simulator] Strategy selected:", { value, type: typeof value })
                    setStrategyId(value)
                  }}
                  disabled={loading || strategies.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={strategies.length === 0 ? "No strategies found" : "Select strategy..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No strategies. Create one first.
                      </div>
                    ) : (
                      strategies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || s.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={rangePreset} onValueChange={setRangePreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANGE_PRESETS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(rangeDates.from)} → {formatDateShort(rangeDates.to)}
                </p>
              </div>
            </div>

            {/* Requested Detectors - show ALL detectors from strategy grouped by category */}
            {selectedStrategy && requestedDetectors.length === 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-500">No detectors configured</p>
                    <p className="text-xs text-muted-foreground">
                      This strategy has no detectors. Edit the strategy in the Strategies page to add detectors.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {requestedDetectors.length > 0 && (
              <div className="pt-4 border-t border-border">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Detectors ({requestedDetectors.length})
                </label>
                <div className="space-y-3 mt-3">
                  {/* Group detectors by category */}
                  {(["gate", "trigger", "confluence"] as DetectorCategory[]).map(category => {
                    const detectorsInCategory = requestedDetectors.filter(id => {
                      const meta = DETECTOR_BY_ID.get(id)
                      return meta?.category === category
                    })
                    if (detectorsInCategory.length === 0) return null
                    
                    const catInfo = CATEGORY_INFO[category]
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{catInfo.icon}</span>
                          <span className="font-medium">{catInfo.labelMn}</span>
                          <span className="text-muted-foreground/50">
                            ({detectorsInCategory.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {detectorsInCategory.map(id => {
                            const meta = DETECTOR_BY_ID.get(id)
                            return (
                              <Badge 
                                key={id} 
                                variant="secondary" 
                                className={cn(
                                  "text-xs",
                                  category === "gate" && "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                                  category === "trigger" && "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
                                  category === "confluence" && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                                )}
                                title={meta?.descriptionMn}
                              >
                                {meta?.labelShort || id}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Show unrecognized detectors */}
                  {requestedDetectors.some(id => !DETECTOR_BY_ID.has(id)) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>❓</span>
                        <span className="font-medium">Unknown</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {requestedDetectors
                          .filter(id => !DETECTOR_BY_ID.has(id))
                          .map(id => (
                            <Badge 
                              key={id} 
                              variant="outline" 
                              className="text-xs border-red-500/30 text-red-500"
                            >
                              {id}
                            </Badge>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeframes info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Running on: <strong className="text-foreground">5m, 15m, 30m, 1h, 4h</strong>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={clearResults}
                disabled={running || !result}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                onClick={runSimulation}
                disabled={running || !symbol || !strategyId}
                className="min-w-[140px]"
              >
                <RotateCcw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
                {running ? "Simulating..." : "Run Simulation"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    Simulation Error
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State with Live Trades Stream */}
        {running && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Running Multi-Timeframe Simulation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Analyzing {symbol} across 5 timeframes...
                  </p>
                  <div className="flex gap-2 mt-4">
                    {TIMEFRAMES.map((tf) => (
                      <Badge key={tf} variant="outline" className="animate-pulse">
                        {tf}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Live Trades Stream Preview */}
            {streamingTrades.length > 0 && (
              <LiveTradesStream trades={streamingTrades} isRunning={true} />
            )}
          </div>
        )}

        {/* Results */}
        {result?.ok && combinedResult && !running && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Combined Summary Cards - Use summary as source of truth (trades is just a sample) */}
            {(() => {
              // Use summary for totals (trades array is only a 30-trade sample, not all trades)
              const totalTrades = combinedResult.summary.entries ?? 0
              const tpHits = combinedResult.summary.tp ?? 0
              const slHits = combinedResult.summary.sl ?? 0
              const winRate = tpHits + slHits > 0 ? (tpHits / (tpHits + slHits)) * 100 : 0
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricCard
                    label="Total Trades"
                    value={totalTrades}
                    subValue="across all TFs"
                  />
                  <MetricCard
                    label="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    subValue={`${tpHits}W / ${slHits}L`}
                    trend={winRate >= 50 ? "up" : "down"}
                  />
                  <MetricCard
                    label="TP Hits"
                    value={tpHits}
                    trend="up"
                  />
                  <MetricCard
                    label="SL Hits"
                    value={slHits}
                    trend="down"
                  />
                  <MetricCard
                    label="Best TF"
                    value={combinedResult.bestTf?.toUpperCase() || "—"}
                    subValue={
                      combinedResult.bestWinrate
                        ? `${combinedResult.bestWinrate.toFixed(1)}% WR`
                        : undefined
                    }
                  />
                </div>
              )
            })()}

            {isNoSetups && (
              <Card className="border-muted">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    No setups found
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Энэ хугацаанд тохирох trigger илрээгүй байна. Entry/TP/SL нь 0 гэж харуулж байна.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Timeframe Tabs */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Simulation Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="combined">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>Overview</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="trades">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        <span>All Trades</span>
                        {result.trades && result.trades.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">
                            {result.trades.length}
                          </Badge>
                        )}
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  {/* Combined Tab - Overview with TF breakdown */}
                  <TabsContent value="combined" className="space-y-6">
                    {/* Quick Stats from trades */}
                    {result.trades && result.trades.length > 0 && (
                      <>
                        {/* Trades by Timeframe breakdown */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Timeframe тус бүрээр
                            </CardTitle>
                            <CardDescription>
                              Entry олдсон timeframe-ээр ангилсан
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-5 gap-3">
                              {TIMEFRAMES.map((tf) => {
                                // Use byTimeframe for accurate counts (trades is only a sample)
                                const tfData = result.byTimeframe?.[tf]?.summary
                                const tfEntries = tfData?.entries ?? 0
                                const tfTP = tfData?.tp ?? 0
                                const tfSL = tfData?.sl ?? 0
                                const tfWR = tfTP + tfSL > 0 ? (tfTP / (tfTP + tfSL)) * 100 : 0

                                return (
                                  <div key={tf} className={cn(
                                    "p-3 rounded-lg border text-center transition-colors",
                                    tfEntries > 0
                                      ? "border-primary/30 bg-primary/5"
                                      : "border-border bg-muted/30"
                                  )}>
                                    <p className="text-sm font-semibold mb-1">{tf.toUpperCase()}</p>
                                    <p className="text-2xl font-bold">{tfEntries}</p>
                                    <p className="text-xs text-muted-foreground">entries</p>
                                    {tfEntries > 0 && (
                                      <div className="mt-2 text-xs">
                                        <span className="text-green-500">{tfTP}W</span>
                                        <span className="mx-1">/</span>
                                        <span className="text-red-500">{tfSL}L</span>
                                        <span className="mx-2">•</span>
                                        <span className={cn(
                                          "font-medium",
                                          tfWR >= 50 ? "text-green-500" : "text-red-500"
                                        )}>
                                          {tfWR.toFixed(0)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Performance Summary */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Гүйцэтгэлийн товч
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-3xl font-bold">{combinedResult.summary.entries ?? 0}</p>
                                <p className="text-xs text-muted-foreground">Нийт Trade</p>
                              </div>
                              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                <p className="text-3xl font-bold text-green-500">
                                  {combinedResult.summary.tp ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">TP Hit</p>
                              </div>
                              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-3xl font-bold text-red-500">
                                  {combinedResult.summary.sl ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">SL Hit</p>
                              </div>
                              <div className={cn(
                                "text-center p-3 rounded-lg",
                                combinedResult.summary.winrate >= 50 ? "bg-green-500/10" : "bg-red-500/10"
                              )}>
                                <p className={cn(
                                  "text-3xl font-bold",
                                  combinedResult.summary.winrate >= 50 ? "text-green-500" : "text-red-500"
                                )}>
                                  {combinedResult.summary.winrate.toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground">Win Rate</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* NEW: 3 KPI Dashboard */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              📊 Гол KPI-ууд
                            </CardTitle>
                            <CardDescription>
                              Strategy-ийн чанарыг хэмжих гол үзүүлэлтүүд
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              // Use summary for totals (trades array is only a 30-trade sample)
                              const totalTrades = combinedResult?.summary?.entries ?? 0
                              const tpCount = combinedResult?.summary?.tp ?? 0
                              const slCount = combinedResult?.summary?.sl ?? 0
                              const timeExitCount = combinedResult?.summary?.timeExit ?? 0
                              const resolvedCount = tpCount + slCount + timeExitCount
                              
                              // Calculate entries per week based on date range
                              const weeks = Math.max(1, Math.ceil((selectedRange || 30) / 7))
                              const entriesPerWeek = totalTrades / weeks
                              
                              // Resolution rate: how many trades completed vs total
                              const resolutionRate = totalTrades > 0 ? (resolvedCount / totalTrades) * 100 : 0
                              
                              // TimeExit rate: how many ended by time instead of TP/SL
                              const timeExitRate = resolvedCount > 0 ? (timeExitCount / resolvedCount) * 100 : 0
                              
                              return (
                                <div className="grid grid-cols-3 gap-4">
                                  {/* Entries per Week */}
                                  <div className={cn(
                                    "text-center p-4 rounded-lg border",
                                    entriesPerWeek >= 3 ? "bg-green-500/10 border-green-500/30" :
                                    entriesPerWeek >= 1 ? "bg-yellow-500/10 border-yellow-500/30" :
                                    "bg-red-500/10 border-red-500/30"
                                  )}>
                                    <p className="text-3xl font-bold">{entriesPerWeek.toFixed(1)}</p>
                                    <p className="text-sm font-medium mt-1">Entries / Week</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {entriesPerWeek < 1 ? "⚠️ Хэт цөөн" :
                                       entriesPerWeek > 10 ? "⚠️ Spam signal?" :
                                       "✅ Хэвийн"}
                                    </p>
                                  </div>
                                  
                                  {/* Resolution Rate */}
                                  <div className={cn(
                                    "text-center p-4 rounded-lg border",
                                    resolutionRate >= 90 ? "bg-green-500/10 border-green-500/30" :
                                    resolutionRate >= 70 ? "bg-yellow-500/10 border-yellow-500/30" :
                                    "bg-red-500/10 border-red-500/30"
                                  )}>
                                    <p className="text-3xl font-bold">{resolutionRate.toFixed(0)}%</p>
                                    <p className="text-sm font-medium mt-1">Resolution Rate</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {resolutionRate < 70 ? "⚠️ Олон pending" :
                                       "✅ Дуусдаг"}
                                    </p>
                                  </div>
                                  
                                  {/* TimeExit Rate */}
                                  <div className={cn(
                                    "text-center p-4 rounded-lg border",
                                    timeExitRate <= 20 ? "bg-green-500/10 border-green-500/30" :
                                    timeExitRate <= 40 ? "bg-yellow-500/10 border-yellow-500/30" :
                                    "bg-red-500/10 border-red-500/30"
                                  )}>
                                    <p className="text-3xl font-bold">{timeExitRate.toFixed(0)}%</p>
                                    <p className="text-sm font-medium mt-1">Time Exit Rate</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {timeExitRate > 40 ? "⚠️ Strategy тодорхойгүй" :
                                       "✅ TP/SL-д хүрдэг"}
                                    </p>
                                  </div>
                                </div>
                              )
                            })()}
                          </CardContent>
                        </Card>

                        {/* Average Duration */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Дундаж хугацаа
                            </CardTitle>
                            <CardDescription>
                              Entry-ээс Exit хүртэл дундаж хугацаа
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-green-500/10 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium">TP дундаж</span>
                                </div>
                                {(() => {
                                  const tpTrades = result.trades?.filter(t => t.outcome === "TP") || []
                                  if (tpTrades.length === 0) return <p className="text-lg font-bold">—</p>
                                  const avgBars = Math.round(tpTrades.reduce((sum, t) => sum + t.duration_bars, 0) / tpTrades.length)
                                  const commonTf = tpTrades[0]?.tf || "15m"
                                  return <p className="text-lg font-bold">{formatDuration(avgBars, commonTf)}</p>
                                })()}
                              </div>
                              <div className="p-3 bg-red-500/10 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-red-500" />
                                  <span className="text-sm font-medium">SL дундаж</span>
                                </div>
                                {(() => {
                                  const slTrades = result.trades?.filter(t => t.outcome === "SL") || []
                                  if (slTrades.length === 0) return <p className="text-lg font-bold">—</p>
                                  const avgBars = Math.round(slTrades.reduce((sum, t) => sum + t.duration_bars, 0) / slTrades.length)
                                  const commonTf = slTrades[0]?.tf || "15m"
                                  return <p className="text-lg font-bold">{formatDuration(avgBars, commonTf)}</p>
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                    
                    {/* Tag Attribution Tables - only if tags exist */}
                    {((combinedResult.tagsAny && combinedResult.tagsAny.length > 0) || 
                      (combinedResult.tagsPrimary && combinedResult.tagsPrimary.length > 0)) && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Tag Attribution - Any Mode */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Tag Attribution (Any)
                            </CardTitle>
                            <CardDescription>
                              Winrate when tag appears in signal
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <TagAttributionTable
                              tags={combinedResult.tagsAny || []}
                            />
                          </CardContent>
                        </Card>

                        {/* Tag Attribution - Primary Mode */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Tag Attribution (Primary)
                            </CardTitle>
                            <CardDescription>
                              Winrate when tag is primary reason
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <TagAttributionTable
                              tags={combinedResult.tagsPrimary || []}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Empty state when no trades */}
                    {(!result.trades || result.trades.length === 0) && (
                      <Card className="border-muted">
                        <CardContent className="py-10 text-center">
                          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <h4 className="text-sm font-medium mb-1">Энэ хугацаанд trade олдсонгүй</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Өдрийн хүрээг өргөтгөх эсвэл өөр detector ашиглаж үзнэ үү.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Trades Tab - Per-trade details - simplified */}
                  <TabsContent value="trades" className="space-y-6">
                    {result.trades && result.trades.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-medium">Бүх Trade-ийн жагсаалт</h3>
                            <p className="text-sm text-muted-foreground">
                              Нийт {combinedResult.summary.entries ?? 0} trade {result.trades.length < (combinedResult.summary.entries ?? 0) && `(${result.trades.length} sample харуулж байна)`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-green-500 border-green-500/30">
                              TP: {combinedResult.summary.tp ?? 0}
                            </Badge>
                            <Badge variant="outline" className="text-red-500 border-red-500/30">
                              SL: {combinedResult.summary.sl ?? 0}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Table Only - removed duplicate visualization */}
                        <TradesTable trades={result.trades} />
                      </>
                    ) : (
                      <Card className="border-muted">
                        <CardContent className="py-10 text-center">
                          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <h4 className="text-sm font-medium mb-1">Trade дэлгэрэнгүй мэдээлэл алга</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Backend-ээс per-trade мэдээлэл ирээгүй байна. Энэ функционал удахгүй нэмэгдэнэ.
                            Одоогоор зөвхөн aggregate статистик (winrate, TP/SL тоо) харагдаж байна.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            {/* PRO Zero Trades Debug Panel with 1-click fixes */}
            {combinedResult?.summary?.entries === 0 && (
              <ZeroTradesDebugPanel
                explainability={result.explainability}
                meta={result.meta}
                onQuickFix={handleQuickFix}
                onRerun={runSimulation}
                isRerunning={running}
              />
            )}

            {/* Detector Classification Panel - Enhanced with categories */}
            {result.meta?.detectorsRequested && result.meta.detectorsRequested.length > 0 && (
              <Card className="border-muted">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      Detector шинжилгээ
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {result.meta.detectorsImplemented?.length || 0}/{result.meta.detectorsRequested.length} дэмжигдсэн
                    </Badge>
                  </div>
                  
                  {/* Group by category with Mongolian labels */}
                  <div className="space-y-3">
                    {(["gate", "trigger", "confluence"] as DetectorCategory[]).map(category => {
                      const allDetectors = result.meta?.detectorsNormalized || result.meta?.detectorsRequested || []
                      const detectorsInCategory = allDetectors.filter(d => {
                        const meta = DETECTOR_BY_ID.get(d)
                        return meta?.category === category
                      })
                      
                      if (detectorsInCategory.length === 0) return null
                      
                      const catInfo = CATEGORY_INFO[category]
                      
                      return (
                        <div key={category} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{catInfo.icon}</span>
                            <span className="font-medium">{catInfo.labelMn}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {detectorsInCategory.map((d, idx) => {
                              const meta = DETECTOR_BY_ID.get(d)
                              const normalizedD = d.toUpperCase().replace(/-/g, "_")
                              const isImplemented = result.meta?.detectorsImplemented?.some(
                                impl => impl.toUpperCase() === normalizedD
                              )
                              const isNotImplemented = result.meta?.detectorsNotImplemented?.some(
                                ni => ni.toUpperCase() === normalizedD
                              )
                              
                              return (
                                <Badge 
                                  key={d} 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    isImplemented && "border-green-500/50 bg-green-500/10 text-green-500",
                                    isNotImplemented && "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
                                    !isImplemented && !isNotImplemented && "border-green-500/50 bg-green-500/10 text-green-500"
                                  )}
                                  title={meta?.descriptionMn || d}
                                >
                                  {isImplemented || (!isNotImplemented) ? "✓" : "⚠"} {meta?.labelShort || d}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Unknown detectors */}
                    {result.meta.detectorsUnknown && result.meta.detectorsUnknown.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>❓</span>
                          <span className="font-medium">Танигдаагүй</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {result.meta.detectorsUnknown.map((d) => (
                            <Badge 
                              key={d} 
                              variant="outline" 
                              className="text-xs border-red-500/50 bg-red-500/10 text-red-500"
                            >
                              ✗ {d}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-3 border-t">
                    <span className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> Дэмжигдсэн
                    </span>
                    {result.meta.detectorsNotImplemented && result.meta.detectorsNotImplemented.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-yellow-500">⚠</span> Удахгүй ({result.meta.detectorsNotImplemented.length})
                      </span>
                    )}
                    {result.meta.detectorsUnknown && result.meta.detectorsUnknown.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-red-500">✗</span> Танигдаагүй ({result.meta.detectorsUnknown.length})
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Source Info */}
            <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Data: {typeof result.meta?.dataSource === "string" 
                ? result.meta.dataSource 
                : result.meta?.dataSource?.source || "unknown"}</span>
              <span>•</span>
              <span>
                Range: {result.meta?.range?.from} → {result.meta?.range?.to}
              </span>
              <span>•</span>
              <span>
                Timeframes: {result.meta?.timeframesRan?.join(", ") || "—"}
              </span>
              {result.meta?.simVersion && (
                <>
                  <span>•</span>
                  <span className="text-green-600">v{result.meta.simVersion}</span>
                </>
              )}
            </div>

            {/* Diagnostics Panel - Replaces DevTools */}
            <DiagnosticsPanel />
          </div>
        )}

        {/* Empty State */}
        {!result && !running && !error && (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Ready to Simulate
                </h3>
                <p className="text-muted-foreground mb-6">
                  Configure your backtest parameters above and click{" "}
                  <span className="text-primary font-medium">Run Simulation</span>{" "}
                  to analyze your strategy across all timeframes.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <Badge key={tf} variant="outline">
                      {tf}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
