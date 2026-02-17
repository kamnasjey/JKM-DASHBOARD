"use client"
// Force recompile v2 - 2026-01-31
import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { AccessGate } from "@/components/access-gate"
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
  History,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { InfoTooltip } from "@/components/guide/info-tooltip"
import { cn } from "@/lib/utils"
import { 
  DETECTOR_BY_ID, 
  CATEGORY_INFO, 
  type DetectorCategory 
} from "@/lib/detectors/catalog"
import { ZeroTradesDebugPanel } from "@/components/simulator/zero-trades-debug-panel"
import { ErrorBoundary } from "@/components/error-boundary"
import { TradesTable } from "@/components/simulator/trades-table"
import { LiveTradesStream } from "@/components/simulator/live-trades-stream"
import { SimulatorProgress } from "@/components/simulator/simulator-progress"
import { useUserPlan } from "@/hooks/use-user-plan"
import { getPlanLimits } from "@/lib/constants/pricing"

// Helper to track daily simulation usage in localStorage
function getSimulatorUsageToday(): number {
  const key = "jkm_simulator_usage"
  const today = new Date().toISOString().split("T")[0]
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}")
    if (data.date === today) {
      return data.count || 0
    }
    // New day - reset counter
    return 0
  } catch {
    return 0
  }
}

function incrementSimulatorUsage(): number {
  const key = "jkm_simulator_usage"
  const today = new Date().toISOString().split("T")[0]
  const currentCount = getSimulatorUsageToday()
  const newCount = currentCount + 1
  try {
    localStorage.setItem(key, JSON.stringify({ date: today, count: newCount }))
  } catch {
    // Private browsing or storage full — ignore
  }
  return newCount
}

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
  entry_ts?: number
  exit_ts?: number | null
  direction?: "BUY" | "SELL"
  side?: "long" | "short"
  entry: number
  sl: number
  tp: number
  exit?: number | null
  outcome: string
  r?: number
  duration_bars?: number
  detector?: string
  symbol?: string
  tf?: string // 5m, 15m, 30m, 1h, 4h
  // Backend may return these alternative field names
  holdingBars?: number
  tEntry?: string
  tExit?: string | null
  horizon?: string
  reasonTags?: string[]
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
  summary?: TFSummary  // Top-level summary (single-TF or fallback)
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

// Simulation history record type (matches API)
interface SimulationRecord {
  id?: string
  strategyId: string
  strategyName: string
  symbol: string
  dateRange: { from: string; to: string }
  timeframes: string[]
  totalTrades: number
  tpCount: number
  slCount: number
  winRate: number
  bestTf?: string
  bestWinRate?: number
  detectors: string[]
  createdAt: string
  tradesSample?: any[]
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

// Fallback symbols when API fails or returns empty
const FALLBACK_SYMBOLS = [
  "EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCAD",
  "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
  "AUDJPY", "EURAUD", "EURCHF", "XAUUSD", "BTCUSD"
]

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
  const { t } = useLanguage()

  // Plan-based limits
  const { plan } = useUserPlan()
  const planLimits = getPlanLimits(plan)
  const maxSimulationsPerDay = planLimits.simulatorPerDay // -1 = unlimited
  const [usedToday, setUsedToday] = useState(0)

  // Load usage count on mount
  useEffect(() => {
    setUsedToday(getSimulatorUsageToday())
  }, [])

  // Check if user can run simulation
  const canRunSimulation = maxSimulationsPerDay === -1 || usedToday < maxSimulationsPerDay
  const remainingSimulations = maxSimulationsPerDay === -1 ? "∞" : Math.max(0, maxSimulationsPerDay - usedToday)

  // Data state
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MultiTFResult | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  // Simulation history state
  const [simulationHistory, setSimulationHistory] = useState<SimulationRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

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
    loadHistory()
  }, [])

  // Load simulation history from Firestore
  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/simulator/history")
      const data = await res.json()
      if (data.ok && data.history) {
        setSimulationHistory(data.history)
      }
    } catch (err) {
      console.error("[simulator] Failed to load history:", err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Save simulation result to Firestore
  async function saveSimulation(simResult: MultiTFResult, strategyInfo: Strategy | undefined) {
    if (!simResult.ok || !simResult.combined) return

    const summary = simResult.combined.summary
    const totalTrades = summary?.entries ?? 0

    // Don't save if no trades
    if (totalTrades === 0) return

    try {
      const record = {
        strategyId: strategyInfo?.id || strategyId,
        strategyName: strategyInfo?.name || strategyInfo?.id || strategyId,
        symbol,
        dateRange: rangeDates,
        timeframes: simResult.meta?.timeframesRan || TIMEFRAMES,
        totalTrades,
        tpCount: summary?.tp ?? 0,
        slCount: summary?.sl ?? 0,
        winRate: summary?.winrate ?? 0,
        bestTf: simResult.combined.bestTf,
        bestWinRate: simResult.combined.bestWinrate,
        detectors: strategyInfo?.detectors || [],
        tradesSample: (simResult.trades || []).slice(0, 10),
      }

      const res = await fetch("/api/simulator/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      })

      const data = await res.json()
      if (data.ok) {
        // Reload history to show new entry
        loadHistory()
        toast({
          title: "Хадгалагдлаа",
          description: "Simulation үр дүн хадгалагдлаа",
        })
      }
    } catch (err) {
      console.error("[simulator] Failed to save simulation:", err)
    }
  }

  // Delete simulation from history
  async function deleteSimulation(simId: string) {
    try {
      const res = await fetch(`/api/simulator/history?id=${simId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.ok) {
        setSimulationHistory(prev => prev.filter(s => s.id !== simId))
        toast({
          title: "Устгагдлаа",
          description: "Simulation устгагдлаа",
        })
      }
    } catch (err) {
      console.error("[simulator] Failed to delete simulation:", err)
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [symbolsRes, strategiesRes] = await Promise.all([
        api.simulator.symbols().catch(() => ({ ok: false, symbols: [] })),
        api.strategiesV2.list().catch(() => ({ ok: false, strategies: [] })),  // Use Firestore v2 API
      ])

      // Use API symbols if available, otherwise fallback to hardcoded list
      const availableSymbols = (symbolsRes.ok && symbolsRes.symbols && symbolsRes.symbols.length > 0)
        ? symbolsRes.symbols
        : FALLBACK_SYMBOLS

      setSymbols(availableSymbols)
      if (availableSymbols.length > 0 && !symbol) {
        setSymbol(availableSymbols[0])
      }

      // Log for debugging
      if (!symbolsRes.ok || !symbolsRes.symbols || symbolsRes.symbols.length === 0) {
        console.log("[simulator] API symbols unavailable, using fallback symbols:", FALLBACK_SYMBOLS.length)
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
      .sort((a, b) => (a.entry_ts ?? 0) - (b.entry_ts ?? 0))
    
    for (let i = 0; i < sanitizedTrades.length; i++) {
      const trade = sanitizedTrades[i]
      
      // Add trade as "entering" - only use sanitized primitive fields
      setStreamingTrades(prev => [
        ...prev,
        {
          id: `trade-${i}`,
          entry_ts: trade.entry_ts ?? 0,
          exit_ts: trade.exit_ts ?? undefined,
          direction: (trade.direction ?? "BUY") as "BUY" | "SELL",
          entry: trade.entry,
          sl: trade.sl,
          tp: trade.tp,
          r: trade.r,
          duration_bars: trade.duration_bars,
          detector: trade.detector ?? "",
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
            ? { ...t, outcome: trade.outcome as "TP" | "SL" | "PENDING", status: "resolved" as const, r: trade.r }
            : t
        )
      )
      
      // Small delay between trades
      await new Promise(r => setTimeout(r, 100))
    }
  }

  // Poll for job completion
  async function pollJobUntilComplete(jid: string): Promise<any> {
    const maxAttempts = 300 // 5 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const jobRes = await api.simulatorV2.jobStatus(jid)
        console.log("[simulator] Poll job status:", { jid, status: jobRes.job?.status, progress: jobRes.job?.progress })

        if (jobRes.job?.status === "completed" && jobRes.job?.result) {
          return jobRes.job.result
        }

        if (jobRes.job?.status === "failed") {
          throw new Error(jobRes.job?.error || "Job failed")
        }

        // Wait 1 second before next poll
        await new Promise(r => setTimeout(r, 1000))
        attempts++
      } catch (err) {
        console.error("[simulator] Poll error:", err)
        throw err
      }
    }

    throw new Error("Job timed out")
  }

  async function runSimulation() {
    // Check plan-based daily limit
    if (!canRunSimulation) {
      toast({
        title: "Өдрийн лимит хүрсэн",
        description: `${plan.toUpperCase()} план дээр өдөрт ${maxSimulationsPerDay} удаа simulator ажиллуулах боломжтой. Маргааш дахин оролдоно уу эсвэл план шинэчлээрэй.`,
        variant: "destructive",
      })
      return
    }

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
    console.log("[simulator] Found strategy:", {
      id: strategy.id,
      name: strategy.name,
      detectors: strategy.detectors,
      detectorsCount: strategy.detectors?.length ?? 0
    })

    // Check if strategy has detectors
    if (!strategy.detectors || strategy.detectors.length === 0) {
      setError("This strategy has no detectors configured. Please edit the strategy in the Strategies page and add at least one detector.")
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setJobId(null)
    setStreamingTrades([])
    setActiveTab("combined")

    try {
      // Call v2 API which loads strategy from Firestore and proxies to backend
      const requestPayload = {
        strategyId,
        symbols: [symbol],
        from: rangeDates.from,
        to: rangeDates.to,
        timeframe: "auto" as const,  // Let backend decide TF based on range
        mode: "detailed" as const,   // Request all trades (not just sample)
        demoMode: false,
      }
      console.log("[simulator] API request payload:", JSON.stringify(requestPayload, null, 2))
      console.log("[simulator] strategyId value:", strategyId, "type:", typeof strategyId, "length:", strategyId?.length)

      let res = await api.simulatorV2.run(requestPayload)

      // Handle async job response - poll until complete
      if (res.ok && res.jobId && res.status === "queued") {
        console.log("[simulator] Async job started:", res.jobId)
        setJobId(res.jobId)

        // Poll for completion
        res = await pollJobUntilComplete(res.jobId)
      }

      // Debug: Log full response with trades info
      console.log("[simulator] API response:", JSON.stringify({
        ok: res.ok,
        error: res.error,
        tradesCount: res.combined?.summary?.entries ?? res.summary?.entries ?? 0,
        tradesArrayLength: res.trades?.length ?? 0,
        tradesSampleLength: res.combined?.tradesSample?.length ?? 0,
        hasTrades: !!res.trades,
        hasTradesSample: !!res.combined?.tradesSample,
        combinedSummary: res.combined?.summary,
        summary: res.summary,
        detectorsRequested: res.meta?.detectorsRequested,
        detectorsImplemented: res.meta?.detectorsImplemented,
        detectorsUnknown: res.meta?.detectorsUnknown,
        explainability: res.explainability,
      }, null, 2))

      if (!res.ok && isGapError(res)) {
        const demoRes = await api.simulatorV2.run({
          strategyId,
          symbols: [symbol],
          from: rangeDates.from,
          to: rangeDates.to,
          timeframe: "auto",
          mode: "detailed",
          demoMode: true,
        })
        const warning = "Data quality issue detected. Ran in demo mode with gaps allowed."
        const patched = addDemoWarning(demoRes, warning)

        // Extract trades from multiple possible locations (single-TF vs multi-TF response)
        const patchedTrades = patched.trades || patched.combined?.tradesSample || (patched as any).debug?.tradesSample || []
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

      // Extract trades from multiple possible locations (multi-TF vs single-TF response)
      // Priority: trades (multi-TF detailed) > combined.tradesSample > debug.tradesSample (single-TF)
      const trades = res.trades || res.combined?.tradesSample || (res as any).tradesSample || (res as any).debug?.tradesSample || []
      console.log("[simulator] Extracted trades:", {
        fromTrades: res.trades?.length ?? 0,
        fromCombinedSample: res.combined?.tradesSample?.length ?? 0,
        fromTradesSample: (res as any).tradesSample?.length ?? 0,
        fromDebugSample: (res as any).debug?.tradesSample?.length ?? 0,
        finalCount: trades.length,
        firstTrade: trades[0] || null,
        timeframe: res.meta?.timeframesRan?.join(", ") ?? "unknown",
      })
      const normalizedRes = { ...res, trades } as MultiTFResult

      setResult(normalizedRes)

      // Increment daily usage counter on successful simulation
      const newUsage = incrementSimulatorUsage()
      setUsedToday(newUsage)

      // Save simulation result to history
      if (normalizedRes.ok) {
        saveSimulation(normalizedRes, strategy)
      }

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

    // Check plan-based daily limit
    if (!canRunSimulation) {
      toast({
        title: "Өдрийн лимит хүрсэн",
        description: `${plan.toUpperCase()} план дээр өдөрт ${maxSimulationsPerDay} удаа simulator ажиллуулах боломжтой.`,
        variant: "destructive",
      })
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setActiveTab("combined")

    try {
      let customFrom = rangeDates.from
      let customTo = rangeDates.to
      let customTimeframe: "auto" | "5m" | "15m" | "1h" | "4h" | "1d" = "auto"
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
        timeframe: customTimeframe,
        mode: "detailed" as const,
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
          timeframe: customTimeframe,
          mode: "detailed" as const,
          demoMode: true,
        })
        const warning = "Data quality issue detected. Ran in demo mode with gaps allowed."
        const patched = addDemoWarning(demoRes, warning)

        // Extract trades from multiple possible locations (single-TF vs multi-TF response)
        const patchedTrades = patched.trades || patched.combined?.tradesSample || (patched as any).debug?.tradesSample || []
        const normalizedPatched = { ...patched, trades: patchedTrades } as MultiTFResult

        setResult(normalizedPatched)
        // Increment usage counter
        const newUsage1 = incrementSimulatorUsage()
        setUsedToday(newUsage1)
        if (!normalizedPatched.ok && normalizedPatched.error) {
          setError(normalizeMessage(normalizedPatched.error))
        }
        return
      }

      // Extract trades from multiple possible locations (multi-TF vs single-TF response)
      const trades = res.trades || res.combined?.tradesSample || (res as any).tradesSample || (res as any).debug?.tradesSample || []
      const normalizedRes = { ...res, trades } as MultiTFResult

      setResult(normalizedRes)
      // Increment usage counter
      const newUsage2 = incrementSimulatorUsage()
      setUsedToday(newUsage2)

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
        <AccessGate feature="simulator">
        <ErrorBoundary
          fallback={
            <div className="min-h-screen bg-background text-foreground">
              <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Card>
                  <CardContent className="py-10 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
                    <p className="text-sm text-muted-foreground">Simulator section error occurred.</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                      Reload
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
                  {t("Strategy Simulator", "Стратеги Симулятор")}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {t("Multi-timeframe backtesting across 5m → 4h", "5m → 4h бүх timeframe дээр backtest хийх")}
                </p>
                {/* Version info - hidden from users, kept in DOM for debugging */}
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {t("Multi-TF Auto", "Multi-TF Авто")}
              </Badge>
            </div>

            {/* Configuration Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("Configuration", "Тохиргоо")}</CardTitle>
            <CardDescription>
              {t("Select your symbol, strategy, and date range. All timeframes run automatically.", "Symbol, стратеги, хугацааны хүрээгээ сонгоно уу. Бүх timeframe автоматаар ажиллана.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Symbol */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Symbol", "Символ")}</label>
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
                <label className="text-sm font-medium">{t("Strategy", "Стратеги")}</label>
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
                <label className="text-sm font-medium">{t("Date Range", "Хугацааны хүрээ")}</label>
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
                {(rangePreset === "90D" || rangePreset === "6M" || rangePreset === "1Y") && (
                  <p className="text-xs text-yellow-500 mt-1">
                    {t("⚠️ Long range = slower scan (~1-3 min)", "⚠️ Урт хугацаа = удаан scan (~1-3 мин)")}
                  </p>
                )}
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
                  {t("Active Detectors", "Идэвхтэй Detector-ууд")} ({requestedDetectors.length})
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
                {t("Running on:", "Ажиллах TF:")} <strong className="text-foreground">5m, 15m, 30m, 1h, 4h</strong>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {/* Daily usage info */}
              <div className="text-sm text-muted-foreground">
                {t("Today's usage:", "Өнөөдрийн хэрэглээ:")}{" "}
                <span className={cn(
                  "font-medium",
                  !canRunSimulation && "text-destructive"
                )}>
                  {usedToday}/{maxSimulationsPerDay === -1 ? "∞" : maxSimulationsPerDay}
                </span>
                <span className="text-xs ml-2">
                  ({plan.toUpperCase()} {t("plan", "план")})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={clearResults}
                  disabled={running || !result}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("Clear", "Цэвэрлэх")}
                </Button>
                <Button
                  onClick={runSimulation}
                  disabled={running || !symbol || !strategyId || !canRunSimulation}
                  className="min-w-[140px]"
                >
                  <RotateCcw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
                  {running ? t("Simulating...", "Симуляци хийж байна...") : !canRunSimulation ? t("Limit reached", "Лимит хүрсэн") : t("Run Simulation", "Симуляци эхлүүлэх")}
                </Button>
              </div>
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
                    {t("Simulation Error", "Симуляцийн алдаа")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State with Step-by-Step Progress */}
        {running && (
          <>
            {/* Modal Overlay with Progress Steps */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="bg-card border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  {t("Simulation running", "Симуляци ажиллаж байна")}
                </h3>
                <SimulatorProgress isRunning={running} jobId={jobId} />
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {symbol} • 5 timeframe
                </p>
              </div>
            </div>

            {/* Live Trades Stream Preview (behind modal) */}
            {streamingTrades.length > 0 && (
              <LiveTradesStream trades={streamingTrades} isRunning={true} />
            )}
          </>
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
                    label={t("Total Trades", "Нийт Trade")}
                    value={totalTrades}
                    subValue={t("across all TFs", "бүх TF дээр")}
                  />
                  <MetricCard
                    label={t("Win Rate", "Ялалтын хувь")}
                    value={`${winRate.toFixed(1)}%`}
                    subValue={`${tpHits}W / ${slHits}L`}
                    trend={winRate >= 50 ? "up" : "down"}
                  />
                  <MetricCard
                    label={t("TP Hits", "TP хүрсэн")}
                    value={tpHits}
                    trend="up"
                  />
                  <MetricCard
                    label={t("SL Hits", "SL хүрсэн")}
                    value={slHits}
                    trend="down"
                  />
                  <MetricCard
                    label={t("Best TF", "Шилдэг TF")}
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
                    {t("No setups found", "Setup олдсонгүй")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("No matching trigger found in this time period. Entry/TP/SL shows 0.", "Энэ хугацаанд тохирох trigger илрээгүй байна. Entry/TP/SL нь 0 гэж харуулж байна.")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Timeframe Tabs */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">{t("Simulation Results", "Симуляцийн үр дүн")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="combined">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{t("Overview", "Ерөнхий")}</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="trades">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        <span>{t("All Trades", "Бүх Trade")}</span>
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
                              {t("By Timeframe", "Timeframe тус бүрээр")}
                            </CardTitle>
                            <CardDescription>
                              {t("Entries found per timeframe", "Entry олдсон timeframe-ээр ангилсан")}
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
                                    <p className="text-xs text-muted-foreground">{t("entries", "entry")}</p>
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
                              {t("Performance Summary", "Гүйцэтгэлийн товч")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-3xl font-bold">{combinedResult.summary.entries ?? 0}</p>
                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">{t("Total Trades", "Нийт Trade")} <InfoTooltip textMn="Нийт нээгдсэн позицийн тоо" textEn="Total positions opened" /></p>
                              </div>
                              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                <p className="text-3xl font-bold text-green-500">
                                  {combinedResult.summary.tp ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">{t("TP Hit", "TP хүрсэн")}</p>
                              </div>
                              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-3xl font-bold text-red-500">
                                  {combinedResult.summary.sl ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">{t("SL Hit", "SL хүрсэн")}</p>
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
                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">Win Rate <InfoTooltip textMn="TP хүрсэн trade-ийн хувь. 30-45% нь R:R 2.5+ үед сайн гүйцэтгэл" textEn="Percentage of trades hitting TP. 30-45% is good with RR 2.5+" /></p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* NEW: 3 KPI Dashboard */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              📊 {t("Key KPIs", "Гол KPI-ууд")}
                            </CardTitle>
                            <CardDescription>
                              {t("Key metrics to measure strategy quality", "Strategy-ийн чанарыг хэмжих гол үзүүлэлтүүд")}
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

                              // Calculate entries per week based on date range preset
                              const rangePresetObj = RANGE_PRESETS.find(r => r.value === rangePreset)
                              const rangeDays = rangePresetObj?.days ?? 30
                              const weeks = Math.max(1, Math.ceil(rangeDays / 7))
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
                                    <p className="text-sm font-medium mt-1">{t("Entries / Week", "Entry / 7 хоног")}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {entriesPerWeek < 1 ? t("⚠️ Too few", "⚠️ Хэт цөөн") :
                                       entriesPerWeek > 10 ? "⚠️ Spam setup?" :
                                       t("✅ Normal", "✅ Хэвийн")}
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
                                    <p className="text-sm font-medium mt-1">{t("Resolution Rate", "Шийдвэрлэлтийн хувь")}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {resolutionRate < 70 ? t("⚠️ Many pending", "⚠️ Олон pending") :
                                       t("✅ Completes", "✅ Дуусдаг")}
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
                                    <p className="text-sm font-medium mt-1">{t("Time Exit Rate", "Цаг дуусах хувь")}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {timeExitRate > 40 ? t("⚠️ Unclear strategy", "⚠️ Strategy тодорхойгүй") :
                                       t("✅ Reaches TP/SL", "✅ TP/SL-д хүрдэг")}
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
                              {t("Average Duration", "Дундаж хугацаа")}
                            </CardTitle>
                            <CardDescription>
                              {t("Average time from Entry to Exit", "Entry-ээс Exit хүртэл дундаж хугацаа")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-green-500/10 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium">{t("TP average", "TP дундаж")}</span>
                                </div>
                                {(() => {
                                  const tpTrades = result.trades?.filter(t => t.outcome === "TP") || []
                                  if (tpTrades.length === 0) return <p className="text-lg font-bold">—</p>
                                  const avgBars = Math.round(tpTrades.reduce((sum, t) => sum + (t.duration_bars || t.holdingBars || 0), 0) / tpTrades.length)
                                  const commonTf = tpTrades[0]?.tf || "15m"
                                  return <p className="text-lg font-bold">{isNaN(avgBars) ? "—" : formatDuration(avgBars, commonTf)}</p>
                                })()}
                              </div>
                              <div className="p-3 bg-red-500/10 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-red-500" />
                                  <span className="text-sm font-medium">{t("SL average", "SL дундаж")}</span>
                                </div>
                                {(() => {
                                  const slTrades = result.trades?.filter(t => t.outcome === "SL") || []
                                  if (slTrades.length === 0) return <p className="text-lg font-bold">—</p>
                                  const avgBars = Math.round(slTrades.reduce((sum, t) => sum + (t.duration_bars || t.holdingBars || 0), 0) / slTrades.length)
                                  const commonTf = slTrades[0]?.tf || "15m"
                                  return <p className="text-lg font-bold">{isNaN(avgBars) ? "—" : formatDuration(avgBars, commonTf)}</p>
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Strategy Дүгнэлт - AI-generated Summary */}
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              📝 {t("Strategy Conclusion", "Strategy Дүгнэлт")}
                            </CardTitle>
                            <CardDescription>
                              {t("Summary of simulation results", "Simulation үр дүнгийн товч тайлбар")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const totalTrades = combinedResult?.summary?.entries ?? 0
                              const tpCount = combinedResult?.summary?.tp ?? 0
                              const slCount = combinedResult?.summary?.sl ?? 0
                              const winRate = combinedResult?.summary?.winrate ?? 0
                              const bestTf = combinedResult?.bestTf?.toUpperCase() || "N/A"
                              const bestWr = combinedResult?.bestWinrate ?? 0

                              // Calculate profit in R
                              const totalR = (result.trades || []).reduce((sum, t) => sum + (t.r || 0), 0)
                              const avgR = totalTrades > 0 ? totalR / totalTrades : 0

                              // Determine performance level
                              const performanceLevel = winRate >= 55 ? "excellent" : winRate >= 50 ? "good" : winRate >= 45 ? "moderate" : "poor"
                              const performanceEmoji = performanceLevel === "excellent" ? "🏆" : performanceLevel === "good" ? "✅" : performanceLevel === "moderate" ? "⚠️" : "❌"
                              const performanceText = performanceLevel === "excellent" ? "Маш сайн" : performanceLevel === "good" ? "Сайн" : performanceLevel === "moderate" ? "Дунд зэрэг" : "Сайжруулах шаардлагатай"

                              // Build recommendation
                              const recommendations: string[] = []
                              if (winRate < 50) {
                                recommendations.push("Win rate 50%-аас доогуур байна - detector тохиргоо эсвэл entry logic засварлах")
                              }
                              if (totalTrades < 20) {
                                recommendations.push("Trade тоо цөөн - илүү урт хугацаа эсвэл илүү олон symbol сонгох")
                              }
                              if (bestTf && bestWr > winRate + 5) {
                                recommendations.push(`${bestTf} timeframe илүү сайн үзүүлэлттэй (${bestWr.toFixed(1)}%) - энэ TF-д анхаарах`)
                              }

                              return (
                                <div className="space-y-4">
                                  {/* Main Summary */}
                                  <div className="p-4 rounded-lg bg-background/50 border">
                                    <p className="text-sm leading-relaxed">
                                      <span className="font-semibold">{symbol}</span> дээр{" "}
                                      <span className="font-semibold">{rangeDates.from}</span> -{" "}
                                      <span className="font-semibold">{rangeDates.to}</span> хооронд{" "}
                                      <span className="text-primary font-bold">{totalTrades}</span> trade олдлоо.{" "}
                                      Үүнээс <span className="text-green-500 font-semibold">{tpCount} TP</span>,{" "}
                                      <span className="text-red-500 font-semibold">{slCount} SL</span> хүрсэн.
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                      <span className="text-lg">{performanceEmoji}</span>
                                      <span className="text-sm font-medium">
                                        Гүйцэтгэл: <span className={winRate >= 50 ? "text-green-500" : "text-red-500"}>{performanceText}</span>
                                      </span>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-sm">
                                        Win Rate: <span className={winRate >= 50 ? "text-green-500" : "text-red-500"}>{winRate.toFixed(1)}%</span>
                                      </span>
                                      {totalR !== 0 && (
                                        <>
                                          <span className="text-muted-foreground">•</span>
                                          <span className="text-sm">
                                            Нийт: <span className={totalR >= 0 ? "text-green-500" : "text-red-500"}>
                                              {totalR >= 0 ? "+" : ""}{totalR.toFixed(1)}R
                                            </span>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Best Timeframe Highlight */}
                                  {bestTf && bestTf !== "N/A" && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Хамгийн сайн Timeframe</p>
                                        <p className="text-xs text-muted-foreground">
                                          <span className="text-green-500 font-bold">{bestTf}</span> timeframe{" "}
                                          <span className="text-green-500 font-semibold">{bestWr.toFixed(1)}%</span> win rate-тэй
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recommendations */}
                                  {recommendations.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        💡 Зөвлөмж
                                      </p>
                                      <ul className="space-y-1">
                                        {recommendations.map((rec, idx) => (
                                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>{rec}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </CardContent>
                        </Card>
                      </>
                    )}

                    
                    {/* Empty state when no trades */}
                    {(!result.trades || result.trades.length === 0) && (
                      <Card className="border-muted">
                        <CardContent className="py-10 text-center">
                          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <h4 className="text-sm font-medium mb-1">{t("No trades found in this period", "Энэ хугацаанд trade олдсонгүй")}</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            {t("Try extending the date range or using different detectors.", "Өдрийн хүрээг өргөтгөх эсвэл өөр detector ашиглаж үзнэ үү.")}
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
                            <h3 className="text-base font-medium">{t("All Trades List", "Бүх Trade-ийн жагсаалт")}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t("Total", "Нийт")} {combinedResult.summary.entries ?? 0} trade {result.trades.length < (combinedResult.summary.entries ?? 0) && `(${result.trades.length} ${t("sample shown", "sample харуулж байна")})`}
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
                          <h4 className="text-sm font-medium mb-1">{t("No trade details available", "Trade дэлгэрэнгүй мэдээлэл алга")}</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            {t("Per-trade info not returned from backend. Currently showing aggregate stats only.", "Backend-ээс per-trade мэдээлэл ирээгүй байна. Одоогоор зөвхөн aggregate статистик харагдаж байна.")}
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
                      {t("Detector Analysis", "Detector шинжилгээ")}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {result.meta.detectorsImplemented?.length || 0}/{result.meta.detectorsRequested.length} {t("supported", "дэмжигдсэн")}
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
                      <span className="text-green-500">✓</span> {t("Supported", "Дэмжигдсэн")}
                    </span>
                    {result.meta.detectorsNotImplemented && result.meta.detectorsNotImplemented.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-yellow-500">⚠</span> {t("Coming soon", "Удахгүй")} ({result.meta.detectorsNotImplemented.length})
                      </span>
                    )}
                    {result.meta.detectorsUnknown && result.meta.detectorsUnknown.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-red-500">✗</span> {t("Unknown", "Танигдаагүй")} ({result.meta.detectorsUnknown.length})
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
                : result.meta?.dataSource?.source || "local_store"}</span>
              <span>•</span>
              <span>
                Range: {result.meta?.range?.from} → {result.meta?.range?.to}
              </span>
              <span>•</span>
              <span>
                Timeframes: {result.meta?.timeframesRan?.join(", ") || "—"}
              </span>
            </div>
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
                  {t("Ready to Simulate", "Симуляци хийхэд бэлэн")}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t(
                    "Configure your backtest parameters above and click",
                    "Дээрх backtest тохиргоогоо хийгээд"
                  )}{" "}
                  <span className="text-primary font-medium">{t("Run Simulation", "Симуляци эхлүүлэх")}</span>{" "}
                  {t(
                    "to analyze your strategy across all timeframes.",
                    "дарж бүх timeframe дээр стратегиа шинжилнэ үү."
                  )}
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

        {/* Simulation History Section */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                {t("Simulation History", "Simulation түүх")}
                {simulationHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {simulationHistory.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              {t("Your recent simulation results saved to your account", "Таны бүртгэлд хадгалагдсан simulation үр дүнгүүд")}
            </CardDescription>
          </CardHeader>

          {showHistory && (
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : simulationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("No simulation history yet", "Simulation түүх байхгүй байна")}</p>
                  <p className="text-xs mt-1">{t("Run a simulation to see results here", "Simulation ажиллуулахад энд харагдана")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left py-2 px-2 font-medium">{t("Date", "Огноо")}</th>
                        <th className="text-left py-2 px-2 font-medium">{t("Strategy", "Стратеги")}</th>
                        <th className="text-left py-2 px-2 font-medium">{t("Symbol", "Символ")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("Trades", "Trade")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("TP", "TP")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("SL", "SL")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("Win Rate", "Win Rate")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("Best TF", "Шилдэг TF")}</th>
                        <th className="text-center py-2 px-2 font-medium">{t("Range", "Хүрээ")}</th>
                        <th className="text-right py-2 px-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationHistory.map((sim) => (
                        <tr key={sim.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2 text-muted-foreground">
                            {new Date(sim.createdAt).toLocaleDateString("mn-MN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-2">
                            <span className="font-medium">{sim.strategyName}</span>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs">
                              {sim.symbol}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-center font-medium">
                            {sim.totalTrades}
                          </td>
                          <td className="py-2 px-2 text-center text-green-500">
                            {sim.tpCount}
                          </td>
                          <td className="py-2 px-2 text-center text-red-500">
                            {sim.slCount}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={cn(
                              "font-medium",
                              sim.winRate >= 50 ? "text-green-500" : "text-red-500"
                            )}>
                              {sim.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {sim.bestTf ? (
                              <Badge variant="secondary" className="text-xs">
                                {sim.bestTf.toUpperCase()}
                                {sim.bestWinRate && (
                                  <span className="ml-1 text-green-500">
                                    {sim.bestWinRate.toFixed(0)}%
                                  </span>
                                )}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                            {sim.dateRange.from && sim.dateRange.to ? (
                              <>
                                {formatDateShort(sim.dateRange.from)} - {formatDateShort(sim.dateRange.to)}
                              </>
                            ) : "—"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => sim.id && deleteSimulation(sim.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
        </div>
      </div>
    </ErrorBoundary>
    </AccessGate>
  )
}
