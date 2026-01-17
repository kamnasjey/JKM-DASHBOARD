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

interface MultiTFResult {
  ok: boolean
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
    timeframesRan: string[]
    dataSource: string
    range: { from: string; to: string }
    symbols: string[]
    warnings: string[]
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
        setStrategies(strategiesRes.strategies)
        if (strategiesRes.strategies.length > 0 && !strategyId) {
          setStrategyId(strategiesRes.strategies[0].id)  // Use 'id' for Firestore v2
        }
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
    setActiveTab("combined")

    try {
      // Call v2 API which loads strategy from Firestore and proxies to backend
      const res = await api.simulatorV2.run({
        strategyId,
        symbols: [symbol],
        from: rangeDates.from,
        to: rangeDates.to,
        timeframe: "auto",  // Let backend decide TF based on range
        mode: "winrate",
        demoMode: false,
      })

      setResult(res as MultiTFResult)

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
          customTimeframe = "1h,4h"
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

      const res = await api.simulatorV2.run({
        strategyId,
        symbols: [symbol],
        from: customFrom,
        to: customTo,
        timeframe: customTimeframe,
        mode: "winrate",
        demoMode: false,
        // Note: customDetectors not passed - server always uses strategy detectors
        // For disable_gates, we'd need a backend feature to override
      })

      setResult(res as MultiTFResult)

      if (!res.ok && res.error) {
        setError(res.error.message)
      }
    } catch (err: any) {
      setError(err.message || "Quick fix simulation failed")
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
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
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
                <Select value={strategyId} onValueChange={setStrategyId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name || s.id}
                      </SelectItem>
                    ))}
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

        {/* Loading State */}
        {running && (
          <Card>
            <CardContent className="py-12">
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
        )}

        {/* Results */}
        {result?.ok && result.combined && !running && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Combined Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                label="Total Trades"
                value={result.combined.summary.entries}
                subValue="across all TFs"
              />
              <MetricCard
                label="Win Rate"
                value={`${result.combined.summary.winrate.toFixed(1)}%`}
                subValue={`${result.combined.summary.tp}W / ${result.combined.summary.sl}L`}
                trend={result.combined.summary.winrate >= 50 ? "up" : "down"}
              />
              <MetricCard
                label="TP Hits"
                value={result.combined.summary.tp}
                trend="up"
              />
              <MetricCard
                label="SL Hits"
                value={result.combined.summary.sl}
                trend="down"
              />
              <MetricCard
                label="Best TF"
                value={result.combined.bestTf?.toUpperCase() || "—"}
                subValue={
                  result.combined.bestWinrate
                    ? `${result.combined.bestWinrate.toFixed(1)}% WR`
                    : undefined
                }
              />
            </div>

            {/* Timeframe Tabs */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Results by Timeframe</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-6 mb-6">
                    <TabsTrigger value="combined">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>Combined</span>
                      </div>
                    </TabsTrigger>
                    {TIMEFRAMES.map((tf) => (
                      <TabsTrigger key={tf} value={tf}>
                        <TFTab
                          tf={tf}
                          result={result.byTimeframe?.[tf]}
                          isActive={activeTab === tf}
                        />
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Combined Tab */}
                  <TabsContent value="combined" className="space-y-6">
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
                            tags={result.combined.tagsAny || []}
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
                            tags={result.combined.tagsPrimary || []}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Individual TF Tabs */}
                  {TIMEFRAMES.map((tf) => (
                    <TabsContent key={tf} value={tf} className="space-y-6">
                      {result.byTimeframe?.[tf]?.error ? (
                        <Card className="border-destructive/50 bg-destructive/10">
                          <CardContent className="py-6 text-center">
                            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                            <p className="text-sm text-destructive">
                              {result.byTimeframe[tf].error}
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* TF Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                              label="Trades"
                              value={result.byTimeframe?.[tf]?.summary?.entries || 0}
                            />
                            <MetricCard
                              label="Win Rate"
                              value={`${(result.byTimeframe?.[tf]?.summary?.winrate || 0).toFixed(1)}%`}
                              trend={
                                (result.byTimeframe?.[tf]?.summary?.winrate || 0) >= 50
                                  ? "up"
                                  : "down"
                              }
                            />
                            <MetricCard
                              label="TP Hits"
                              value={result.byTimeframe?.[tf]?.summary?.tp || 0}
                            />
                            <MetricCard
                              label="SL Hits"
                              value={result.byTimeframe?.[tf]?.summary?.sl || 0}
                            />
                          </div>

                          {/* By Horizon */}
                          {result.byTimeframe?.[tf]?.byHorizon && (
                            <div className="grid md:grid-cols-2 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">Intraday</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                      <p className="text-2xl font-bold">
                                        {result.byTimeframe[tf].byHorizon?.intraday?.entries || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Trades</p>
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-green-500">
                                        {result.byTimeframe[tf].byHorizon?.intraday?.tp || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">TP</p>
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-red-500">
                                        {result.byTimeframe[tf].byHorizon?.intraday?.sl || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">SL</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">Swing</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                      <p className="text-2xl font-bold">
                                        {result.byTimeframe[tf].byHorizon?.swing?.entries || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Trades</p>
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-green-500">
                                        {result.byTimeframe[tf].byHorizon?.swing?.tp || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">TP</p>
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-red-500">
                                        {result.byTimeframe[tf].byHorizon?.swing?.sl || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">SL</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}

                          {/* Suggestions */}
                          {result.byTimeframe?.[tf]?.suggestions &&
                            result.byTimeframe[tf].suggestions!.length > 0 && (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">Suggestions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-2">
                                    {result.byTimeframe[tf].suggestions!.map((s: any, i: number) => (
                                      <li
                                        key={i}
                                        className="text-sm text-muted-foreground flex items-start gap-2"
                                      >
                                        <span className="text-primary">•</span>
                                        {s.title || s}
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            )}
                        </>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Warnings */}
            {result.meta?.warnings && result.meta.warnings.length > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {result.meta.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* PRO Zero Trades Debug Panel with 1-click fixes */}
            {result.combined?.summary?.entries === 0 && (
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
              <span>Data: {result.meta?.dataSource || "unknown"}</span>
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
  )
}
