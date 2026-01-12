"use client"

import { useState, useEffect } from "react"
import { Play, Loader2, BarChart3, TrendingUp, AlertCircle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import type { DetectorInfo } from "@/lib/types"

interface BacktestResult {
  ok: boolean
  total_matched: number
  ok_count: number
  none_count: number
  hit_rate: number | null
  by_symbol: Record<string, { ok: number; none: number; total: number; hit_rate: number | null }>
  signals_sample: Array<{
    signal_id: string
    symbol: string
    tf: string
    direction: string
    status: string
    rr: number | null
    created_at: number
  }>
  filters: {
    strategy_id: string | null
    detectors: string[]
    symbol: string | null
    days: number
  }
}

export default function BacktestPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [detectors, setDetectors] = useState<DetectorInfo[]>([])
  const [symbols, setSymbols] = useState<string[]>([])
  
  // Form state
  const [selectedDetectors, setSelectedDetectors] = useState<string[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all")
  const [days, setDays] = useState(30)
  
  // Result
  const [result, setResult] = useState<BacktestResult | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [detectorsData, symbolsData] = await Promise.all([
        api.detectors().catch(() => ({ detectors: [] })),
        api.symbols().catch(() => ({ symbols: [] })),
      ])
      setDetectors(detectorsData?.detectors || [])
      setSymbols(Array.isArray(symbolsData) ? symbolsData : symbolsData?.symbols || [])
    } catch (err) {
      console.error("Failed to load initial data:", err)
    }
  }

  const toggleDetector = (name: string) => {
    setSelectedDetectors((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    )
  }

  const runBacktest = async () => {
    setLoading(true)
    setResult(null)

    try {
      const params: any = { days }
      if (selectedDetectors.length > 0) {
        params.detectors = selectedDetectors
      }
      if (selectedSymbol && selectedSymbol !== "all") {
        params.symbol = selectedSymbol
      }

      const data = await api.backtest(params)
      setResult(data)

      if (data.total_matched === 0) {
        toast({
          title: "Үр дүн",
          description: "Тохирох дохио олдсонгүй",
        })
      }
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Backtest ажиллуулж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Backtest</h1>
          <p className="text-sm text-muted-foreground">
            Historical дохиог шүүж, detector/strategy-ийн гүйцэтгэлийг шалгах
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Filters */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Шүүлтүүр</CardTitle>
              <CardDescription>Backtest параметрүүд</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Days */}
              <div className="space-y-2">
                <Label htmlFor="days">Хугацаа (өдөр)</Label>
                <Input
                  id="days"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 30)}
                  min={1}
                  max={365}
                />
              </div>

              {/* Symbol */}
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Бүгд" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {symbols.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detectors */}
              <div className="space-y-2">
                <Label>Detectors</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-2">
                  {detectors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Detector байхгүй</p>
                  ) : (
                    detectors.map((d) => (
                      <div key={d.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={d.name}
                          checked={selectedDetectors.includes(d.name)}
                          onCheckedChange={() => toggleDetector(d.name)}
                        />
                        <label
                          htmlFor={d.name}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {d.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedDetectors.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedDetectors.length} detector сонгосон
                  </p>
                )}
              </div>

              <Button onClick={runBacktest} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ажиллаж байна...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Backtest ажиллуулах
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {result ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Нийт тохирсон</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-xl font-bold">{result.total_matched}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">OK</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-xl font-bold text-green-500">{result.ok_count}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">NONE</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-xl font-bold text-red-500">{result.none_count}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Hit Rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-xl font-bold">
                        {result.hit_rate !== null ? `${(result.hit_rate * 100).toFixed(1)}%` : "—"}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {/* By Symbol */}
                {Object.keys(result.by_symbol).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Symbol-аар</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(result.by_symbol)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([symbol, stats]) => (
                            <div key={symbol} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{symbol}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {stats.total}
                                  </Badge>
                                </div>
                                <span className="text-muted-foreground">
                                  {stats.hit_rate !== null ? `${(stats.hit_rate * 100).toFixed(0)}%` : "—"}
                                </span>
                              </div>
                              <Progress
                                value={stats.hit_rate !== null ? stats.hit_rate * 100 : 0}
                                className="h-2"
                              />
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sample Signals */}
                {result.signals_sample.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Жишээ дохио (эхний 20)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.signals_sample.map((sig) => (
                          <div
                            key={sig.signal_id}
                            className="flex items-center justify-between rounded-lg border p-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant={sig.direction === "BUY" ? "default" : "destructive"}>
                                {sig.direction}
                              </Badge>
                              <span className="font-medium">{sig.symbol}</span>
                              <span className="text-muted-foreground">{sig.tf}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sig.rr && (
                                <span className="text-xs text-muted-foreground">RR {sig.rr.toFixed(1)}</span>
                              )}
                              <Badge variant={sig.status === "OK" ? "default" : "secondary"}>
                                {sig.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Зүүн талын шүүлтүүрийг тохируулаад <br />
                    <strong>Backtest ажиллуулах</strong> товчийг дарна уу
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
