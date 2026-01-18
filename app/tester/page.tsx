"use client"

import { useState, useEffect } from "react"
import { Play, History, Settings, TrendingUp, TrendingDown, Target, AlertTriangle, Info } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { normalizeDetectorList } from "@/lib/detector-utils"
import Link from "next/link"

// Extended detector info with Cyrillic labels
interface DetectorInfo {
  id: string
  name?: string
  labelMn: string
  descriptionMn: string
  category: "gate" | "trigger" | "confluence"
  doc?: string
}

interface TesterRun {
  run_id: string
  created_at: string
  status: string
  trade_count: number
  config_hash: string
  data_hash: string
  duration_seconds: number
  metrics?: {
    total_trades: number
    winning_trades: number
    win_rate: number
    total_pnl_pips: number
    total_pnl_usd: number
    profit_factor: number
    max_drawdown_pct: number
    sharpe_ratio: number
  }
  config_details?: {
    symbol: string
    detectors: string[]
    entry_tf: string
  }
}

const SYMBOLS = ["XAUUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"]
const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1"]
const INTRABAR_POLICIES = [
  { value: "sl_first", label: "SL First (Conservative)" },
  { value: "tp_first", label: "TP First (Optimistic)" },
  { value: "bar_magnifier", label: "Bar Magnifier (Accurate)" },
  { value: "random", label: "Random (50/50)" },
]

export default function StrategyTesterPage() {
  useAuthGuard(true)
  
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [detectors, setDetectors] = useState<DetectorInfo[]>([])
  const [runs, setRuns] = useState<TesterRun[]>([])
  
  // Form state
  const [symbol, setSymbol] = useState("XAUUSD")
  const [selectedDetectors, setSelectedDetectors] = useState<string[]>([])
  const [entryTf, setEntryTf] = useState("M15")
  const [trendTf, setTrendTf] = useState("H4")
  const [spreadPips, setSpreadPips] = useState(1.0)
  const [slippagePips, setSlippagePips] = useState(0.5)
  const [commission, setCommission] = useState(0.0)
  const [initialCapital, setInitialCapital] = useState(10000)
  const [riskPerTrade, setRiskPerTrade] = useState(1.0)
  const [intrabarPolicy, setIntrabarPolicy] = useState("sl_first")
  const [minRr, setMinRr] = useState(2.0)
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(10)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [detectorsData, runsData] = await Promise.all([
        api.detectors().catch(() => ({ detectors: [] })),
        api.strategyTester.listRuns().catch(() => ({ runs: [] })),
      ])
      
      // Map detectors to include 'name' for backward compat
      const mappedDetectors = (detectorsData?.detectors || []).map((d: any) => ({
        ...d,
        name: d.id,
      }))
      setDetectors(mappedDetectors)
      setRuns(runsData?.runs || [])
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDetectorToggle = (detectorId: string) => {
    setSelectedDetectors(prev => {
      if (prev.includes(detectorId)) {
        return prev.filter(d => d !== detectorId)
      }
      return [...prev, detectorId]
    })
  }
  
  const runTest = async () => {
    if (selectedDetectors.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one detector",
        variant: "destructive",
      })
      return
    }
    
    // Normalize detectors before running
    const normalizedDetectors = normalizeDetectorList(selectedDetectors)
    
    setRunning(true)
    
    try {
      const result = await api.strategyTester.run({
        symbol,
        detectors: normalizedDetectors,
        entry_tf: entryTf,
        trend_tf: trendTf,
        spread_pips: spreadPips,
        slippage_pips: slippagePips,
        commission_per_trade: commission,
        initial_capital: initialCapital,
        risk_per_trade_pct: riskPerTrade,
        intrabar_policy: intrabarPolicy as any,
        min_rr: minRr,
        max_trades_per_day: maxTradesPerDay,
      })
      
      if (result.ok) {
        toast({
          title: "Test Completed",
          description: `${result.trade_count} trades, Win rate: ${(result.metrics?.win_rate * 100).toFixed(1)}%`,
        })
        // Reload runs
        const runsData = await api.strategyTester.listRuns()
        setRuns(runsData?.runs || [])
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to run test",
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }
  
  const deleteRun = async (runId: string) => {
    try {
      await api.strategyTester.deleteRun(runId)
      setRuns(prev => prev.filter(r => r.run_id !== runId))
      toast({ title: "Deleted" })
    } catch (err) {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Strategy Tester</h1>
          <p className="text-muted-foreground">
            Professional backtesting with no lookahead bias
          </p>
        </div>
        
        <Tabs defaultValue="run" className="space-y-6">
          <TabsList>
            <TabsTrigger value="run" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Run Test
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History ({runs.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Run Test Tab */}
          <TabsContent value="run" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Settings */}
              <div className="space-y-6">
                {/* Symbol & Timeframe */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Select value={symbol} onValueChange={setSymbol}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYMBOLS.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Entry TF</Label>
                        <Select value={entryTf} onValueChange={setEntryTf}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEFRAMES.map(tf => (
                              <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trend TF</Label>
                        <Select value={trendTf} onValueChange={setTrendTf}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEFRAMES.map(tf => (
                              <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Execution Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Execution Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Spread (pips): {spreadPips}</Label>
                        <Slider
                          value={[spreadPips]}
                          onValueChange={([v]) => setSpreadPips(v)}
                          min={0}
                          max={5}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slippage (pips): {slippagePips}</Label>
                        <Slider
                          value={[slippagePips]}
                          onValueChange={([v]) => setSlippagePips(v)}
                          min={0}
                          max={3}
                          step={0.1}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Commission per trade ($)</Label>
                      <Input
                        type="number"
                        value={commission}
                        onChange={e => setCommission(parseFloat(e.target.value) || 0)}
                        step={0.1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Intrabar Policy</Label>
                      <Select value={intrabarPolicy} onValueChange={setIntrabarPolicy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTRABAR_POLICIES.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How to resolve when both SL and TP are hit in the same bar
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Risk Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Initial Capital ($)</Label>
                        <Input
                          type="number"
                          value={initialCapital}
                          onChange={e => setInitialCapital(parseInt(e.target.value) || 10000)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Risk per Trade (%): {riskPerTrade}</Label>
                        <Slider
                          value={[riskPerTrade]}
                          onValueChange={([v]) => setRiskPerTrade(v)}
                          min={0.1}
                          max={5}
                          step={0.1}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min R:R Ratio: {minRr}</Label>
                        <Slider
                          value={[minRr]}
                          onValueChange={([v]) => setMinRr(v)}
                          min={1}
                          max={5}
                          step={0.5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Trades/Day: {maxTradesPerDay}</Label>
                        <Slider
                          value={[maxTradesPerDay]}
                          onValueChange={([v]) => setMaxTradesPerDay(v)}
                          min={1}
                          max={20}
                          step={1}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right Column - Detectors */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Select Detectors ({selectedDetectors.length})
                    </CardTitle>
                    <CardDescription>
                      Choose which detectors to backtest
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                      {detectors.map(det => (
                        <div
                          key={det.id || det.name || 'unknown'}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleDetectorToggle(det.id || det.name || '')}
                        >
                          <Checkbox
                            checked={selectedDetectors.includes(det.id || det.name || '')}
                            onCheckedChange={() => handleDetectorToggle(det.id || det.name || '')}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{det.labelMn || det.name || det.id}</p>
                            {det.doc && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {det.doc}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedDetectors.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Selected:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDetectors.map(d => (
                            <Badge
                              key={d}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => handleDetectorToggle(d)}
                            >
                              {d} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Run Button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={runTest}
                  disabled={running || selectedDetectors.length === 0}
                >
                  {running ? (
                    <>Running Test...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
                
                {selectedDetectors.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Select at least one detector to run the test
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {runs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No test runs yet. Run your first backtest!
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {runs.map(run => (
                  <Card key={run.run_id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-mono">
                            {run.run_id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            {new Date(run.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Badge variant={run.status === "completed" ? "default" : "destructive"}>
                          {run.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Config info */}
                      {run.config_details && (
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">{run.config_details.symbol}</Badge>
                          <Badge variant="outline">{run.config_details.entry_tf}</Badge>
                          {run.config_details.detectors?.slice(0, 2).map(d => (
                            <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                          ))}
                          {(run.config_details.detectors?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{run.config_details.detectors!.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Metrics */}
                      {run.metrics && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>{run.trade_count} trades</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={run.metrics.win_rate >= 0.5 ? "text-green-500" : "text-red-500"}>
                              {(run.metrics.win_rate * 100).toFixed(1)}% win
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {run.metrics.total_pnl_usd >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={run.metrics.total_pnl_usd >= 0 ? "text-green-500" : "text-red-500"}>
                              ${run.metrics.total_pnl_usd.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            PF: {run.metrics.profit_factor.toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button asChild variant="ghost" size="sm" className="flex-1">
                          <Link href={`/tester/runs/${run.run_id}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteRun(run.run_id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
