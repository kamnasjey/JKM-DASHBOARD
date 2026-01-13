"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react"

// Types
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

// Preset ranges
const RANGE_PRESETS = [
  { value: "7D", label: "7 хоног" },
  { value: "30D", label: "30 хоног" },
  { value: "90D", label: "90 хоног" },
  { value: "6M", label: "6 сар" },
  { value: "1Y", label: "1 жил" },
]

// Timeframes
const TIMEFRAMES = [
  { value: "M5", label: "M5" },
  { value: "M15", label: "M15" },
  { value: "H1", label: "H1" },
  { value: "H4", label: "H4" },
]

export default function SimulatorPage() {
  // State
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulatorResult | null>(null)

  // Form state
  const [symbol, setSymbol] = useState("")
  const [timeframe, setTimeframe] = useState("M5")
  const [strategyId, setStrategyId] = useState("")
  const [rangePreset, setRangePreset] = useState("30D")

  // Load symbols and strategies on mount
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load symbols
      const symbolsRes = await api.simulator.symbols()
      if (symbolsRes.ok && symbolsRes.symbols) {
        setSymbols(symbolsRes.symbols)
        if (symbolsRes.symbols.length > 0 && !symbol) {
          setSymbol(symbolsRes.symbols[0])
        }
      }

      // Load strategies
      const strategiesRes = await api.strategies()
      if (strategiesRes.strategies) {
        setStrategies(strategiesRes.strategies)
        if (strategiesRes.strategies.length > 0 && !strategyId) {
          setStrategyId(strategiesRes.strategies[0].strategy_id)
        }
      }
    } catch (err: any) {
      setError(err.message || "Өгөгдөл ачаалахад алдаа гарлаа")
    } finally {
      setLoading(false)
    }
  }

  async function runSimulation() {
    if (!symbol || !strategyId) {
      setError("Symbol болон Strategy сонгоно уу")
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
      setError(err.message || "Симуляц ажиллуулахад алдаа гарлаа")
    } finally {
      setRunning(false)
    }
  }

  // Format timestamp to readable date
  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Format price
  function formatPrice(price: number) {
    if (price > 100) return price.toFixed(2)
    return price.toFixed(5)
  }

  // Get selected strategy name
  const selectedStrategy = strategies.find((s) => s.strategy_id === strategyId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Strategy Simulator</h1>
        <p className="text-muted-foreground">
          Түүхэн өгөгдөл дээр стратегиа турших
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Тохиргоо</CardTitle>
          <CardDescription>
            Symbol, timeframe, strategy, range сонгоод Run дарна уу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Symbol */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Select value={symbol} onValueChange={setSymbol} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Symbol сонгох..." />
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

            {/* Timeframe */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
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
                  <SelectValue placeholder="Strategy сонгох..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.strategy_id} value={s.strategy_id}>
                      {s.name || s.strategy_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Хугацаа</label>
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
            </div>

            {/* Run Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium opacity-0">Run</label>
              <Button
                onClick={runSimulation}
                disabled={running || !symbol || !strategyId}
                className="w-full"
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ажиллаж байна...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Selected strategy info */}
          {selectedStrategy && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Detectors:</span>{" "}
                {selectedStrategy.detectors?.join(", ") || "—"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result?.ok && result.summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Нийт оролт</p>
                <p className="text-2xl font-bold">{result.summary.entries}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">TP хүрсэн</p>
                <p className="text-2xl font-bold text-green-600">{result.summary.tp_hits}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">SL хүрсэн</p>
                <p className="text-2xl font-bold text-red-600">{result.summary.sl_hits}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{result.summary.winrate.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Avg R</p>
                <p className={`text-2xl font-bold ${result.summary.avg_r >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {result.summary.avg_r.toFixed(2)}R
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total R</p>
                <p className={`text-2xl font-bold ${result.summary.total_r >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {result.summary.total_r.toFixed(1)}R
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Profit Factor</p>
                <p className="text-2xl font-bold">
                  {result.summary.profit_factor?.toFixed(2) || "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{result.summary.avg_duration_bars.toFixed(0)} bars</p>
              </CardContent>
            </Card>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <Card className="border-yellow-500">
              <CardContent className="pt-4">
                <p className="font-medium text-yellow-600 mb-2">Анхааруулга:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Trades Table */}
          <Card>
            <CardHeader>
              <CardTitle>Trades ({result.trades?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {result.trades && result.trades.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Огноо</TableHead>
                        <TableHead>Чиглэл</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>SL</TableHead>
                        <TableHead>TP</TableHead>
                        <TableHead>Үр дүн</TableHead>
                        <TableHead>R</TableHead>
                        <TableHead>Хугацаа</TableHead>
                        <TableHead>Detector</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.trades.map((trade, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">
                            {formatDate(trade.entry_ts)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={trade.direction === "BUY" ? "default" : "secondary"}>
                              {trade.direction === "BUY" ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {trade.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatPrice(trade.entry)}</TableCell>
                          <TableCell className="text-red-600">{formatPrice(trade.sl)}</TableCell>
                          <TableCell className="text-green-600">{formatPrice(trade.tp)}</TableCell>
                          <TableCell>
                            <Badge variant={trade.outcome === "TP" ? "default" : "destructive"}>
                              {trade.outcome === "TP" ? (
                                <Target className="h-3 w-3 mr-1" />
                              ) : null}
                              {trade.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className={trade.r >= 0 ? "text-green-600" : "text-red-600"}>
                            {trade.r >= 0 ? "+" : ""}{trade.r.toFixed(2)}R
                          </TableCell>
                          <TableCell>{trade.duration_bars} bars</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {trade.detector}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Энэ хугацаанд trade олдсонгүй.</p>
                  <p className="text-sm mt-2">
                    Илүү урт хугацаа эсвэл өөр strategy сонгоод туршина уу.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!result && !running && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Strategy Simulator</h3>
            <p className="text-muted-foreground mt-2">
              Symbol, strategy сонгоод Run товч дарж симуляц ажиллуулна уу.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
