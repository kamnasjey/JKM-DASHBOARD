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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { 
  Loader2, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  Lightbulb,
  Clock,
  Shield,
  BarChart3,
  Sun,
  Moon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Tag
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"

// ============================================
// Types
// ============================================
interface TagItem {
  tag: string
  trades: number
  tp: number
  sl: number
  winrate: number
  open: number
  timeExit: number
  share: number
  shareType: "tag_frequency" | "trade_share"
  lift: number
  stderr: number
  liftZ: number
  significant: boolean
  priorityScore: number
}

interface TagInsightsData {
  mode: "any" | "primary"
  minTradesPerTag: number
  shareType: "tag_frequency" | "trade_share"
  overall: { trades: number; tp: number; sl: number; winrate: number }
  byTag: TagItem[]
  topPositive: TagItem[]
  topNegative: TagItem[]
}

interface Strategy {
  id: string
  name: string
  detectors: string[]
  enabled?: boolean
}

interface SimulatorResult {
  ok: boolean
  summary?: {
    entries: number
    tp: number
    sl: number
    open: number
    timeExit?: number
    winrate: number
  }
  byHorizon?: {
    intraday: { entries: number; tp: number; sl: number; open: number; timeExit?: number; winrate: number }
    swing: { entries: number; tp: number; sl: number; open: number; timeExit?: number; winrate: number }
  }
  insights?: {
    winrateBySession: Record<string, number>
    winrateByVolatility: Record<string, number>
    winrateByTrendAligned: Record<string, number>
    tagsAny?: TagInsightsData
    tagsPrimary?: TagInsightsData
  }
  suggestions?: Array<{
    title?: string
    why: string
    how?: string
    type?: string
    priority?: "high" | "medium" | "low"
    suggestion?: string
  }>
  explainability?: {
    rootCause: string
    explanation: string
    debugInfo: {
      unknownDetectorsDropped?: string[]
      detectorHitCounts?: Record<string, number>
      gateBlockCounts?: Record<string, number>
      reasonCounts?: Record<string, number>
      entriesBeforeMerge?: Record<string, number>
      entriesAfterMerge?: Record<string, number>
    }
    entriesBeforeMerge?: {
      intraday: number
      swing: number
      total: number
    }
  }
  meta?: {
    baseTimeframe: string
    range: { from: string; to: string }
    demoMode: boolean
    symbols: string[]
    confidenceScore?: number
    dataTier?: "green" | "yellow" | "red"
    warnings: unknown[]
    // Detector classification for UI transparency
    detectorsRequested?: string[]
    detectorsRecognized?: string[]
    detectorsImplemented?: string[]
    detectorsNotImplemented?: string[]
    detectorsUnknown?: string[]
  }
  demoMode?: boolean
  demoMessage?: string
  error?: {
    code: string
    message: string
    gapRatio?: number
    confidenceScore?: number
    suggestedActions?: string[]
  }
}

// ============================================
// Constants
// ============================================
const RANGE_PRESETS = [
  { value: "7D", label: "Last 7 days", days: 7 },
  { value: "30D", label: "Last 30 days", days: 30 },
  { value: "90D", label: "Last 90 days", days: 90 },
  { value: "6M", label: "Last 6 months", days: 180 },
]

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD"]

function getDateRange(preset: string): { from: string; to: string } {
  const to = new Date()
  const range = RANGE_PRESETS.find((r) => r.value === preset)
  const days = range?.days || 30
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function formatWarning(input: unknown): string {
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
// Summary Card Component
// ============================================
interface SummaryCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  variant?: "default" | "success" | "danger" | "warning" | "muted" | "primary"
  subtext?: string
}

function SummaryCard({ label, value, icon, variant = "default", subtext }: SummaryCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-green-500/30 bg-green-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    muted: "border-muted bg-muted/20",
    primary: "border-primary/50 bg-primary/5",
  }
  const valueStyles = {
    default: "text-foreground",
    success: "text-green-500",
    danger: "text-red-500",
    warning: "text-amber-500",
    muted: "text-muted-foreground",
    primary: "text-primary",
  }
  
  return (
    <Card className={cn("transition-all hover:shadow-md", variantStyles[variant])}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className={cn("text-2xl font-bold", valueStyles[variant])}>{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  )
}

// ============================================
// Insights Card Component
// ============================================
interface InsightRowProps {
  label: string
  value: number
  icon?: React.ReactNode
}

function InsightRow({ label, value, icon }: InsightRowProps) {
  const getColor = (wr: number) => {
    if (wr >= 50) return "text-green-500"
    if (wr >= 30) return "text-amber-500"
    return "text-red-500"
  }
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn("font-semibold", getColor(value))}>{value.toFixed(1)}%</span>
    </div>
  )
}

// ============================================
// Page Component
// ============================================
export default function SimulatorMVPPage() {
  const { toast } = useToast()

  // Data state
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SimulatorResult | null>(null)

  // Form state
  const [strategyId, setStrategyId] = useState("")
  const [symbols, setSymbols] = useState<string[]>(["XAUUSD"])
  const [rangePreset, setRangePreset] = useState("30D")
  const [demoMode, setDemoMode] = useState(false)
  const [tagsMode, setTagsMode] = useState<"any" | "primary">("any")

  // Computed
  const selectedStrategy = strategies.find((s) => s.id === strategyId)
  const dateRange = useMemo(() => getDateRange(rangePreset), [rangePreset])
  
  // Get the active tags data based on toggle
  const activeTags = useMemo(() => {
    if (!result?.insights) return null
    return tagsMode === "any" 
      ? result.insights.tagsAny 
      : result.insights.tagsPrimary
  }, [result?.insights, tagsMode])

  // Load strategies on mount
  useEffect(() => {
    loadStrategies()
  }, [])

  async function loadStrategies() {
    setLoading(true)
    try {
      const res = await api.strategiesV2.list()
      if (res.ok && res.strategies) {
        setStrategies(res.strategies)
        if (res.strategies.length > 0 && !strategyId) {
          setStrategyId(res.strategies[0].id)
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: "Failed to load strategies",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function runSimulation() {
    if (!strategyId || symbols.length === 0) {
      toast({
        title: "Warning",
        description: "Please select a strategy and at least one symbol",
        variant: "destructive",
      })
      return
    }

    // Check if strategy has detectors
    if (!selectedStrategy?.detectors || selectedStrategy.detectors.length === 0) {
      toast({
        title: "No Detectors",
        description: "This strategy has no detectors. Please edit the strategy and add detectors first.",
        variant: "destructive",
      })
      return
    }

    setRunning(true)
    setResult(null)

    try {
      const res = await api.simulatorV2.run({
        strategyId,
        symbols,
        from: dateRange.from,
        to: dateRange.to,
        timeframe: "auto",
        mode: "winrate",
        demoMode,
      })

      setResult(res)

      if (!res.ok && res.error) {
        // Don't show toast for DATA_GAP - it's displayed in UI
        if (res.error.code !== "DATA_GAP") {
          toast({
            title: "Error",
            description: formatWarning(res.error.message),
            variant: "destructive",
          })
        }
      } else if (res.ok) {
        toast({
          title: "Success",
          description: `Analyzed ${res.summary?.entries || 0} trades`,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Simulation failed"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }

  function toggleSymbol(sym: string) {
    if (symbols.includes(sym)) {
      setSymbols(symbols.filter((s) => s !== sym))
    } else if (symbols.length < 10) {
      setSymbols([...symbols, sym])
    }
  }

  function retryWithDemoMode() {
    setDemoMode(true)
    // Trigger simulation after state update
    setTimeout(() => runSimulation(), 100)
  }

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card>
              <CardContent className="py-10 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
                <p className="text-sm text-muted-foreground">Simulator (MVP) хэсэг алдаа гарлаа.</p>
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
        <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Strategy Simulator</h1>
          <p className="text-muted-foreground">
            Test your strategy&apos;s performance on historical data
          </p>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>Select strategy, symbols, and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Strategy Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Strategy</label>
                <Select value={strategyId} onValueChange={setStrategyId}>
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
                {selectedStrategy && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedStrategy.detectors.length === 0 ? (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        No detectors - edit strategy to add
                      </span>
                    ) : (
                      selectedStrategy.detectors.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">
                          {d}
                        </Badge>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Date Range */}
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
                  {dateRange.from} → {dateRange.to}
                </p>
              </div>

              {/* Demo Mode Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                  <Switch 
                    id="demo-mode" 
                    checked={demoMode} 
                    onCheckedChange={setDemoMode}
                  />
                  <label htmlFor="demo-mode" className="text-sm cursor-pointer">
                    Demo Mode
                    <span className="block text-xs text-muted-foreground">
                      Proceed even with data gaps
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Symbol Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbols ({symbols.length}/10)</label>
              <div className="flex flex-wrap gap-2">
                {SYMBOLS.map((sym) => (
                  <Badge
                    key={sym}
                    variant={symbols.includes(sym) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleSymbol(sym)}
                  >
                    {sym}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <Button 
              onClick={runSimulation} 
              disabled={running || !strategyId || symbols.length === 0}
              className="w-full md:w-auto"
              size="lg"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running simulation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Simulation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* DATA_GAP Error */}
        {result && !result.ok && result.error?.code === "DATA_GAP" && (
          <Alert variant="destructive" className="border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Quality Issue</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{formatWarning(result.error.message)}</p>
              {result.error.gapRatio && (
                <p className="text-sm">
                  Gap ratio: <strong>{(result.error.gapRatio * 100).toFixed(1)}%</strong>
                  {result.error.confidenceScore && (
                    <> • Confidence: <strong>{(result.error.confidenceScore * 100).toFixed(0)}%</strong></>
                  )}
                </p>
              )}
              {result.error.suggestedActions && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Suggested actions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.error.suggestedActions.map((action, i) => (
                      <li key={i}>{formatWarning(action)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryWithDemoMode}
                className="mt-2"
              >
                <Play className="mr-2 h-3 w-3" />
                Retry with Demo Mode
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Other Errors */}
        {result && !result.ok && result.error && result.error.code !== "DATA_GAP" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error: {result.error.code}</AlertTitle>
            <AlertDescription>{formatWarning(result.error.message)}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result?.ok && result.summary && (
          <>
            {/* Warnings Banner */}
            {result.meta?.warnings && result.meta.warnings.length > 0 && (
              <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-500">Warnings</AlertTitle>
                <AlertDescription className="text-amber-500/80">
                  <ul className="list-disc list-inside space-y-1">
                    {result.meta.warnings.map((w, i) => (
                      <li key={i}>{formatWarning(w)}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Detector Classification Panel */}
            {result.meta?.detectorsRequested && result.meta.detectorsRequested.length > 0 && (
              <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Detector Analysis</span>
                  <span className="text-xs text-muted-foreground">
                    {result.meta.detectorsImplemented?.length || 0}/{result.meta.detectorsRequested.length} supported
                  </span>
                </div>
                
                {/* Requested Detectors */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Requested ({result.meta.detectorsRequested.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {result.meta.detectorsRequested.map((d) => {
                      const isImplemented = result.meta?.detectorsImplemented?.includes(d)
                      const isNotImplemented = result.meta?.detectorsNotImplemented?.includes(d)
                      const isUnknown = result.meta?.detectorsUnknown?.includes(d)
                      return (
                        <Badge 
                          key={d} 
                          variant="outline" 
                          className={`text-xs ${
                            isImplemented ? "border-green-500/50 text-green-600" :
                            isNotImplemented ? "border-yellow-500/50 text-yellow-600" :
                            isUnknown ? "border-red-500/50 text-red-600" :
                            ""
                          }`}
                          title={
                            isImplemented ? "✓ Supported by simulator" :
                            isNotImplemented ? "⚠ Known but not implemented" :
                            isUnknown ? "✗ Unknown detector" :
                            "Pending classification"
                          }
                        >
                          {isImplemented && "✓ "}{isNotImplemented && "⚠ "}{isUnknown && "✗ "}{d}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <span className="text-green-600">✓</span> Supported
                  </span>
                  {result.meta.detectorsNotImplemented && result.meta.detectorsNotImplemented.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-600">⚠</span> Not implemented ({result.meta.detectorsNotImplemented.length})
                    </span>
                  )}
                  {result.meta.detectorsUnknown && result.meta.detectorsUnknown.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-red-600">✗</span> Unknown ({result.meta.detectorsUnknown.length})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Demo Mode Banner */}
            {result.meta?.demoMode && (
              <Alert variant="default" className="border-blue-500/50 bg-blue-500/10">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">Demo Mode Active</AlertTitle>
                <AlertDescription className="text-blue-500/80">
                  Results may be less accurate due to data gaps.
                </AlertDescription>
              </Alert>
            )}

            {/* Explainability Callout - 0 Trades */}
            {result.summary.entries === 0 && result.explainability && (
              <Alert variant="default" className="border-orange-500/50 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500">Why 0 Trades?</AlertTitle>
                <AlertDescription className="text-orange-500/80 space-y-2">
                  <p>{formatWarning(result.explainability.explanation)}</p>
                  
                  {/* Unknown detectors */}
                  {result.explainability.debugInfo?.unknownDetectorsDropped && 
                   result.explainability.debugInfo.unknownDetectorsDropped.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Unknown detectors: </span>
                      <code className="bg-orange-500/20 px-1 rounded">
                        {result.explainability.debugInfo.unknownDetectorsDropped.join(", ")}
                      </code>
                    </div>
                  )}
                  
                  {/* Gate blocking stats */}
                  {result.explainability.debugInfo?.gateBlockCounts && 
                   Object.keys(result.explainability.debugInfo.gateBlockCounts).length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Filtering gates: </span>
                      {Object.entries(result.explainability.debugInfo.gateBlockCounts).map(([gate, count], i) => (
                        <span key={gate}>
                          {i > 0 && ", "}
                          {gate}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Entries before merge info */}
                  {result.explainability.entriesBeforeMerge && 
                   result.explainability.entriesBeforeMerge.total > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Note: {result.explainability.entriesBeforeMerge.total} candidate(s) detected before filtering 
                      (intraday: {result.explainability.entriesBeforeMerge.intraday}, 
                      swing: {result.explainability.entriesBeforeMerge.swing})
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryCard 
                label="Entries" 
                value={result.summary.entries}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <SummaryCard 
                label="TP Hits" 
                value={result.summary.tp}
                icon={<TrendingUp className="h-4 w-4" />}
                variant="success"
              />
              <SummaryCard 
                label="SL Hits" 
                value={result.summary.sl}
                icon={<TrendingDown className="h-4 w-4" />}
                variant="danger"
              />
              <SummaryCard 
                label="Time Exit" 
                value={result.summary.timeExit || 0}
                icon={<Clock className="h-4 w-4" />}
                variant="warning"
              />
              <SummaryCard 
                label="Winrate" 
                value={`${result.summary.winrate.toFixed(1)}%`}
                icon={<Target className="h-4 w-4" />}
                variant={result.summary.winrate >= 50 ? "success" : result.summary.winrate >= 30 ? "warning" : "danger"}
              />
              <SummaryCard 
                label="Confidence" 
                value={`${((result.meta?.confidenceScore || 1) * 100).toFixed(0)}%`}
                icon={<Shield className="h-4 w-4" />}
                variant={
                  result.meta?.dataTier === "green" ? "success" : 
                  result.meta?.dataTier === "yellow" ? "warning" : "danger"
                }
                subtext={result.meta?.dataTier ? `Data: ${result.meta.dataTier}` : undefined}
              />
            </div>

            {/* By Horizon Table */}
            {result.byHorizon && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Performance by Horizon</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Horizon</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Entries</th>
                          <th className="text-center py-2 px-3 font-medium text-green-500">TP</th>
                          <th className="text-center py-2 px-3 font-medium text-red-500">SL</th>
                          <th className="text-center py-2 px-3 font-medium text-amber-500">Time Exit</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Open</th>
                          <th className="text-right py-2 px-3 font-medium">Winrate</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/30">
                          <td className="py-3 px-3 font-medium">
                            <span className="flex items-center gap-2">
                              <Sun className="h-4 w-4 text-amber-500" />
                              Intraday
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">{result.byHorizon.intraday.entries}</td>
                          <td className="text-center py-3 px-3 text-green-500">{result.byHorizon.intraday.tp}</td>
                          <td className="text-center py-3 px-3 text-red-500">{result.byHorizon.intraday.sl}</td>
                          <td className="text-center py-3 px-3 text-amber-500">{result.byHorizon.intraday.timeExit || 0}</td>
                          <td className="text-center py-3 px-3 text-muted-foreground">{result.byHorizon.intraday.open}</td>
                          <td className="text-right py-3 px-3">
                            <span className={cn(
                              "font-bold",
                              result.byHorizon.intraday.winrate >= 50 ? "text-green-500" : 
                              result.byHorizon.intraday.winrate >= 30 ? "text-amber-500" : "text-red-500"
                            )}>
                              {result.byHorizon.intraday.winrate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/30">
                          <td className="py-3 px-3 font-medium">
                            <span className="flex items-center gap-2">
                              <Moon className="h-4 w-4 text-blue-500" />
                              Swing
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">{result.byHorizon.swing.entries}</td>
                          <td className="text-center py-3 px-3 text-green-500">{result.byHorizon.swing.tp}</td>
                          <td className="text-center py-3 px-3 text-red-500">{result.byHorizon.swing.sl}</td>
                          <td className="text-center py-3 px-3 text-amber-500">{result.byHorizon.swing.timeExit || 0}</td>
                          <td className="text-center py-3 px-3 text-muted-foreground">{result.byHorizon.swing.open}</td>
                          <td className="text-right py-3 px-3">
                            <span className={cn(
                              "font-bold",
                              result.byHorizon.swing.winrate >= 50 ? "text-green-500" : 
                              result.byHorizon.swing.winrate >= 30 ? "text-amber-500" : "text-red-500"
                            )}>
                              {result.byHorizon.swing.winrate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insights Section */}
            {result.insights && (
              <div className="grid md:grid-cols-3 gap-4">
                {/* By Session */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Winrate by Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {Object.entries(result.insights.winrateBySession).map(([session, wr]) => (
                      <InsightRow 
                        key={session} 
                        label={session}
                        value={wr}
                        icon={
                          session === "Asia" ? "🌏" :
                          session === "London" ? "🇬🇧" :
                          session === "NY" ? "🇺🇸" : "🌙"
                        }
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* By Volatility */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-amber-500" />
                      Winrate by Volatility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {Object.entries(result.insights.winrateByVolatility).map(([vol, wr]) => (
                      <InsightRow 
                        key={vol} 
                        label={vol.charAt(0).toUpperCase() + vol.slice(1)}
                        value={wr}
                        icon={
                          vol === "low" ? "📉" :
                          vol === "med" ? "📊" : "📈"
                        }
                      />
                    ))}
                  </CardContent>
                </Card>

                {/* By Trend Alignment */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Winrate by Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {Object.entries(result.insights.winrateByTrendAligned).map(([aligned, wr]) => (
                      <InsightRow 
                        key={aligned} 
                        label={aligned === "aligned" ? "Trend Aligned" : "Counter Trend"}
                        value={wr}
                        icon={
                          aligned === "aligned" 
                            ? <ArrowUpRight className="h-3 w-3 text-green-500" />
                            : <ArrowDownRight className="h-3 w-3 text-red-500" />
                        }
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Improvement Suggestions
                  </CardTitle>
                  <CardDescription>Data-driven recommendations to improve your strategy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.suggestions.map((s, i) => {
                    const isDataDriven = !!s.type
                    const priorityStyles = {
                      high: "border-l-green-500 bg-green-500/5",
                      medium: "border-l-amber-500 bg-amber-500/5",
                      low: "border-l-muted bg-muted/30",
                    }
                    
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "p-4 rounded-lg border-l-4 transition-all hover:shadow-sm",
                          isDataDriven ? priorityStyles[s.priority || "medium"] : "border-l-blue-500 bg-blue-500/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">
                              {s.suggestion || s.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {s.why}
                            </p>
                            {s.how && (
                              <p className="text-sm mt-2 text-foreground/80">
                                <strong>How:</strong> {s.how}
                              </p>
                            )}
                          </div>
                          {isDataDriven && s.priority && (
                            <Badge 
                              variant={s.priority === "high" ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {s.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Meta Info Footer */}
            {result.meta && (
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Timeframe: <strong className="text-foreground">{result.meta.baseTimeframe}</strong>
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span>
                      Symbols: <strong className="text-foreground">{result.meta.symbols.join(", ")}</strong>
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span>
                      Range: <strong className="text-foreground">{result.meta.range.from} → {result.meta.range.to}</strong>
                    </span>
                    {result.meta.demoMode && (
                      <>
                        <span className="hidden md:inline">•</span>
                        <Badge variant="outline" className="text-xs">Demo Mode</Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
