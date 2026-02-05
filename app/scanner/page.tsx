"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle, 
  Target, 
  Activity,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { api } from "@/lib/api"
import { getDashboardVersion } from "@/lib/version"
import { getStrategyDetectors, getDetectorCountLabel } from "@/lib/strategies/get-strategy-detectors"
import { cn } from "@/lib/utils"
import {
  useSymbolRegimes,
  getSymbolDetectorWarnings,
  formatRegimeText,
  formatWarningText,
} from "@/hooks/use-symbol-regimes"

const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
  "DOGEUSDT", "SOLUSDT", "MATICUSDT", "DOTUSDT", "SHIBUSDT",
  "AVAXUSDT", "LINKUSDT", "LTCUSDT", "ATOMUSDT", "UNIUSDT"
]

const TIMEFRAME_OPTIONS = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
]

interface Strategy {
  id: string
  name: string
  detectors: string[]
  enabled?: boolean
}

interface ScanStatus {
  running: boolean
  runId?: string
  startedAt?: string
  lastCycleAt?: string
  nextCycleAt?: string
  config?: {
    strategyId: string
    strategyName: string
    symbols: string[]
    timeframes: string[]
    lookbackDays: number
    intervalSec: number
  }
  counters?: {
    cycles: number
    setupsFound: number
    errors: number
  }
  lastErrors?: Array<{
    ts: string
    symbol?: string
    tf?: string
    error: string
  }>
  simVersion?: string
}

interface SetupResult {
  ts: string
  symbol: string
  tf: string
  strategyId: string
  triggersHit?: number
  confluenceHit?: number
  gatesPassed?: boolean
  summary?: {
    confidence?: number
    bias?: string
  }
}

export default function ScannerPage() {
  useAuthGuard(true)
  const { toast } = useToast()

  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(true)
  
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("")
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SYMBOLS.slice(0, 10))
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(["15m", "1h", "4h"])
  const [lookbackDays, setLookbackDays] = useState(30)
  const [intervalSec, setIntervalSec] = useState(120)
  
  const [status, setStatus] = useState<ScanStatus | null>(null)
  const [results, setResults] = useState<SetupResult[]>([])
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  
  const [showErrors, setShowErrors] = useState(false)
  const [showConfig, setShowConfig] = useState(true)

  useEffect(() => {
    loadStrategies()
    refreshStatus()
  }, [])

  useEffect(() => {
    if (!status?.running) return
    const interval = setInterval(() => refreshStatus(), 10000)
    return () => clearInterval(interval)
  }, [status?.running])

  const loadStrategies = async () => {
    try {
      setLoadingStrategies(true)
      const res = await api.strategiesV2.list({ limit: 50 })
      if (res.ok && res.strategies) {
        setStrategies(res.strategies)
        if (res.strategies.length > 0 && !selectedStrategyId) {
          setSelectedStrategyId(res.strategies[0].id)
        }
      }
    } catch (err: any) {
      console.error("[scanner] Failed to load strategies:", err)
    } finally {
      setLoadingStrategies(false)
    }
  }

  const refreshStatus = useCallback(async () => {
    try {
      setLoadingStatus(true)
      const res = await api.scanner.status()
      if (res.ok !== false) {
        setStatus(res as ScanStatus)
        if (res.running) {
          const resultsRes = await api.scanner.results(50)
          if (resultsRes.ok) {
            setResults(resultsRes.results || [])
          }
        }
      }
    } catch (err: any) {
      console.error("[scanner] Status error:", err)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const handleStart = async () => {
    if (!selectedStrategyId) {
      toast({ title: "Error", description: "Please select a strategy", variant: "destructive" })
      return
    }

    const strategy = strategies.find(s => s.id === selectedStrategyId)
    if (!strategy) {
      toast({ title: "Error", description: "Strategy not found", variant: "destructive" })
      return
    }

    // V2: Backend fetches detectors from strategy - we only send strategyId
    // This ensures backend always uses latest strategy config
    // DO NOT send detectors field - backend ignores it and emits warning

    setStarting(true)
    try {
      const res = await api.scanner.start({
        strategyId: strategy.id,
        // V2: strategyId ONLY - backend fetches detectors from Firestore
        symbols: selectedSymbols,
        timeframes: selectedTimeframes,
        lookbackDays,
        intervalSec,
        // Setup criteria
        minRR: 1.5,
        minConfirmHits: 1,
      })

      if (res.ok) {
        toast({ title: "Scanner Started", description: `Scanning ${selectedSymbols.length} symbols` })
        await refreshStatus()
        setShowConfig(false)
      } else {
        toast({ title: "Failed", description: res.message || res.error || "Unknown error", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to start", variant: "destructive" })
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      const res = await api.scanner.stop()
      if (res.ok) {
        toast({ title: "Scanner Stopped" })
        await refreshStatus()
      } else {
        toast({ title: "Failed", description: res.message || "Unknown error", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to stop", variant: "destructive" })
    } finally {
      setStopping(false)
    }
  }

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol])
  }

  const toggleTimeframe = (tf: string) => {
    setSelectedTimeframes(prev => prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf])
  }

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId)
  const detectorInfo = selectedStrategy ? getStrategyDetectors(selectedStrategy) : null
  const dashboardVersion = getDashboardVersion()

  // Fetch regime data for selected symbols
  const { regimes: symbolRegimes, loading: loadingRegimes, refresh: refreshRegimes } = useSymbolRegimes(selectedSymbols)

  // Get selected strategy's detectors for warning calculation
  const strategyDetectors = selectedStrategy?.detectors || []

  // Calculate warnings for each selected symbol
  const symbolWarnings = selectedSymbols.reduce((acc, symbol) => {
    acc[symbol] = getSymbolDetectorWarnings(symbolRegimes[symbol], strategyDetectors)
    return acc
  }, {} as Record<string, ReturnType<typeof getSymbolDetectorWarnings>>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Setup Scanner
            </h1>
            <p className="text-muted-foreground">Continuous scanning for trading setups</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">dash:{dashboardVersion}</Badge>
            {status?.simVersion && <Badge variant="secondary" className="text-xs">sim:{status.simVersion}</Badge>}
            {status?.running ? (
              <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                <Wifi className="h-3 w-3 animate-pulse" />Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />Stopped
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refreshStatus()} disabled={loadingStatus}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loadingStatus && "animate-spin")} />Refresh
            </Button>
          </div>
        </div>

        {/* Status Panel */}
        {status?.running && status.config && (
          <Card className="border-green-500/30 bg-green-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500 animate-pulse" />Scanner Active
              </CardTitle>
              <CardDescription>Strategy: {status.config.strategyName || status.config.strategyId}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cycles</p>
                  <p className="text-2xl font-bold">{status.counters?.cycles || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Setups Found</p>
                  <p className="text-2xl font-bold text-green-500">{status.counters?.setupsFound || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-500">{status.counters?.errors || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Cycle</p>
                  <p className="text-sm font-mono">{status.nextCycleAt ? new Date(status.nextCycleAt).toLocaleTimeString() : "—"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="destructive" onClick={handleStop} disabled={stopping}>
                  <Square className={cn("h-4 w-4 mr-1", stopping && "animate-pulse")} />
                  {stopping ? "Stopping..." : "Stop Scanner"}
                </Button>
                {status.lastErrors && status.lastErrors.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowErrors(!showErrors)}>
                    <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                    {status.lastErrors.length} Errors
                    {showErrors ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                  </Button>
                )}
              </div>
              {showErrors && status.lastErrors && status.lastErrors.length > 0 && (
                <div className="mt-4 space-y-2">
                  {status.lastErrors.slice(0, 5).map((err, i) => (
                    <div key={i} className="text-xs p-2 bg-red-500/10 rounded border border-red-500/30">
                      <span className="text-muted-foreground">{new Date(err.ts).toLocaleTimeString()}</span>
                      {err.symbol && <span className="ml-2 font-mono">{err.symbol}/{err.tf}</span>}
                      <span className="ml-2">{err.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scanner Configuration</CardTitle>
                <CardDescription>Select strategy, symbols, and timeframes to scan</CardDescription>
              </div>
              {status?.running && (
                <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}>
                  {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardHeader>
          {showConfig && (
            <CardContent className="space-y-6">
              {/* Strategy Selection */}
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId} disabled={status?.running || loadingStrategies}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingStrategies ? "Loading..." : "Select a strategy"} />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({getDetectorCountLabel(s)})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {detectorInfo && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">G{detectorInfo.counts.gates}</Badge>
                    <Badge variant="outline" className="text-green-500 border-green-500/50">T{detectorInfo.counts.triggers}</Badge>
                    <Badge variant="outline" className="text-blue-500 border-blue-500/50">C{detectorInfo.counts.confluence}</Badge>
                    {detectorInfo.counts.unknown > 0 && (
                      <Badge variant="outline" className="text-red-500 border-red-500/50">⚠️ {detectorInfo.counts.unknown} unknown</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Symbols */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Symbols ({selectedSymbols.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => refreshRegimes()} disabled={loadingRegimes}>
                      <RefreshCw className={cn("h-3 w-3 mr-1", loadingRegimes && "animate-spin")} />
                      Regime
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSymbols(DEFAULT_SYMBOLS)} disabled={status?.running}>All</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSymbols([])} disabled={status?.running}>None</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SYMBOLS.map(symbol => (
                    <Button
                      key={symbol}
                      variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSymbol(symbol)}
                      disabled={status?.running}
                      className="h-7 text-xs"
                    >
                      {symbol.replace("USDT", "")}
                    </Button>
                  ))}
                </div>

                {/* Regime Display for Selected Symbols */}
                {selectedSymbols.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Market Regime (1H | 4H | 1D)</Label>
                    <div className="space-y-1 text-xs">
                      {selectedSymbols.map(symbol => {
                        const regimeData = symbolRegimes[symbol]
                        const warnings = symbolWarnings[symbol] || []
                        const hasWarnings = warnings.length > 0

                        return (
                          <div
                            key={symbol}
                            className={cn(
                              "flex flex-col p-2 rounded border",
                              hasWarnings ? "border-yellow-500/30 bg-yellow-500/5" : "border-border/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold">{symbol.replace("USDT", "")}</span>
                              <span className="text-muted-foreground">
                                {regimeData?.loading ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  formatRegimeText(regimeData)
                                )}
                              </span>
                            </div>
                            {hasWarnings && (
                              <div className="mt-1 text-yellow-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{formatWarningText(warnings)}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeframes */}
              <div className="space-y-2 border-t pt-4">
                <Label>Timeframes</Label>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map(tf => (
                    <Button
                      key={tf.value}
                      variant={selectedTimeframes.includes(tf.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTimeframe(tf.value)}
                      disabled={status?.running}
                      className="h-8"
                    >
                      {tf.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Lookback (days)</Label>
                  <Input
                    type="number"
                    value={lookbackDays}
                    onChange={e => setLookbackDays(parseInt(e.target.value) || 30)}
                    min={7}
                    max={365}
                    disabled={status?.running}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scan Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={intervalSec}
                    onChange={e => setIntervalSec(parseInt(e.target.value) || 120)}
                    min={30}
                    max={3600}
                    disabled={status?.running}
                  />
                </div>
              </div>

              {/* Start Button */}
              {!status?.running && (
                <Button
                  onClick={handleStart}
                  disabled={starting || !selectedStrategyId || selectedSymbols.length === 0 || selectedTimeframes.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Play className={cn("h-5 w-5 mr-2", starting && "animate-pulse")} />
                  {starting ? "Starting..." : "Start Scanner"}
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Found Setups ({results.length})
              </CardTitle>
              <CardDescription>Latest trading setups detected by the scanner</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Triggers</TableHead>
                    <TableHead>Confluence</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Bias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, 20).map((setup, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{new Date(setup.ts).toLocaleTimeString()}</TableCell>
                      <TableCell className="font-semibold">{setup.symbol}</TableCell>
                      <TableCell><Badge variant="outline">{setup.tf}</Badge></TableCell>
                      <TableCell><span className="text-green-500 font-medium">{setup.triggersHit}</span></TableCell>
                      <TableCell><span className="text-blue-500 font-medium">{setup.confluenceHit}</span></TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            setup.summary?.confidence && setup.summary.confidence >= 0.7
                              ? "border-green-500 text-green-500"
                              : "border-yellow-500 text-yellow-500"
                          )}
                        >
                          {((setup.summary?.confidence || 0) * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          setup.summary?.bias === "bullish" && "text-green-500",
                          setup.summary?.bias === "bearish" && "text-red-500"
                        )}>
                          {setup.summary?.bias || "neutral"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!status?.running && results.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scanner Running</h3>
              <p className="text-muted-foreground mb-4">Configure and start the scanner to continuously find trading setups</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
