"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Filter,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  X
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSymbols } from "@/hooks/use-symbols"
import { useAuthGuard } from "@/lib/auth-guard"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getDashboardVersion } from "@/lib/version"
import { cn } from "@/lib/utils"
import {
  type UnifiedSignal,
  type ScannerResult,
  mapScannerResultToUnified,
  mapOldSignalToUnified,
  mergeSignals,
  hasLowCoverage,
  getConfidenceLevel,
  formatDirection,
  formatTimestamp,
} from "@/lib/signals/unified"
import type { SignalPayloadPublicV1 } from "@/lib/types"

// ============================================================
// Scanner Status Type
// ============================================================

interface ScannerStatus {
  ok: boolean
  running: boolean
  runId?: string
  startedAt?: string
  lastCycleAt?: string
  nextCycleAt?: string
  config?: {
    strategyId?: string
    strategyName?: string
    symbols?: string[]
    timeframes?: string[]
  }
  counters?: {
    cycles: number
    setupsFound: number
    errors: number
  }
  simVersion?: string
  error?: string
}

// ============================================================
// Health Strip Component
// ============================================================

function ScannerHealthStrip({
  status,
  loading,
  onRefresh
}: {
  status: ScannerStatus | null
  loading: boolean
  onRefresh: () => void
}) {
  const dashboardVersion = getDashboardVersion()

  if (!status) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-950/10">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Scanner статус авахад алдаа гарлаа</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isRunning = status.running
  const counters = status.counters || { cycles: 0, setupsFound: 0, errors: 0 }

  return (
    <Card className={cn(
      "border transition-colors",
      isRunning ? "border-green-500/30 bg-green-950/10" : "border-muted"
    )}>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  Scanner Running
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Scanner Stopped
                </Badge>
              )}
            </div>

            {/* Counters */}
            {isRunning && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Cycles: {counters.cycles}
                </span>
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Setups: {counters.setupsFound}
                </span>
                {counters.errors > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-3 w-3" />
                    Errors: {counters.errors}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {status.lastCycleAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last: {formatTimestamp(status.lastCycleAt)}
              </span>
            )}

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                dash:{dashboardVersion}
              </Badge>
              {status.simVersion && (
                <Badge variant="outline" className="text-xs">
                  sim:{status.simVersion}
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Signal Row Component
// ============================================================

function SignalRow({
  signal,
  onToggle
}: {
  signal: UnifiedSignal
  onToggle?: (id: string, taken: boolean) => void
}) {
  const lowCoverage = hasLowCoverage(signal)
  const confidenceLevel = getConfidenceLevel(signal.confidence)
  const entryTaken = signal.entry_taken

  const confidenceColor = {
    high: "text-green-500",
    medium: "text-yellow-500",
    low: "text-red-500",
    unknown: "text-muted-foreground",
  }[confidenceLevel]

  return (
    <TableRow>
      {/* Source Badge */}
      <TableCell>
        <Badge
          variant={signal.source === "scanner" ? "default" : "secondary"}
          className={cn(
            "text-xs",
            signal.source === "scanner" && "bg-purple-600"
          )}
        >
          {signal.source === "scanner" ? (
            <><Zap className="h-3 w-3 mr-1" />Scanner</>
          ) : (
            "Signal"
          )}
        </Badge>
      </TableCell>

      {/* Symbol */}
      <TableCell className="font-mono font-medium">{signal.symbol}</TableCell>

      {/* Timeframe */}
      <TableCell>{signal.timeframe}</TableCell>

      {/* Direction */}
      <TableCell>
        <Badge variant={signal.direction === "long" ? "default" : signal.direction === "short" ? "destructive" : "secondary"}>
          {formatDirection(signal.direction)}
        </Badge>
      </TableCell>

      {/* Confidence */}
      <TableCell className={confidenceColor}>
        {signal.confidence !== undefined
          ? `${(signal.confidence * 100).toFixed(0)}%`
          : "—"
        }
      </TableCell>

      {/* RR */}
      <TableCell>
        {signal.rr !== undefined ? signal.rr.toFixed(2) : "—"}
      </TableCell>

      {/* Strategy */}
      <TableCell className="max-w-[150px] truncate">
        {signal.strategyName || signal.strategyId?.slice(0, 8) || "—"}
      </TableCell>

      {/* Time */}
      <TableCell className="text-muted-foreground text-sm">
        {formatTimestamp(signal.ts)}
      </TableCell>

      {/* Entry Toggle (Signals only) */}
      <TableCell className="text-center">
        {signal.source === "signals" ? (
          <Button
            variant={entryTaken === true ? "default" : entryTaken === false ? "outline" : "ghost"}
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              entryTaken === true && "bg-green-600 hover:bg-green-700",
              entryTaken === false && "border-red-500 text-red-500"
            )}
            onClick={() => {
              const rawId = signal.id.replace("signals:", "")
              onToggle?.(rawId, entryTaken !== true)
            }}
            title={entryTaken === true ? "Entry Taken" : "Mark as Taken"}
          >
            {entryTaken === true ? (
              <Check className="h-4 w-4" />
            ) : entryTaken === false ? (
              <X className="h-4 w-4" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell>
        {signal.links?.openSimulator && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={signal.links.openSimulator}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Sim
            </Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// ============================================================
// Empty State Components
// ============================================================

function EmptyScannerState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Scanner setup олдсонгүй</h3>
        <p className="text-muted-foreground mb-4">
          Scanner ажиллаж байна уу? Шалгана уу.
        </p>
        <Button variant="outline" asChild>
          <Link href="/scanner">
            <Activity className="h-4 w-4 mr-2" />
            Scanner хуудас руу очих
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptySignalsState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Дохио олдсонгүй</p>
      </CardContent>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-500/30 bg-red-950/10">
      <CardContent className="py-8 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-500 mb-2">Алдаа гарлаа</h3>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Дахин оролдох
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Signals Table Component
// ============================================================

function UnifiedSignalsTable({
  signals,
  onToggle
}: {
  signals: UnifiedSignal[]
  onToggle?: (id: string, taken: boolean) => void
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>TF</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>RR</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-center">Entry</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} onToggle={onToggle} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function SignalsPage() {
  useAuthGuard(true)
  const { toast } = useToast()
  const { symbols } = useSymbols()

  // State
  const [activeTab, setActiveTab] = useState<"all" | "scanner" | "signals">("all")
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus | null>(null)
  const [scannerResults, setScannerResults] = useState<ScannerResult[]>([])
  const [oldSignals, setOldSignals] = useState<SignalPayloadPublicV1[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    symbol: "all",
    direction: "all",
    rrMin: "",
    rrMax: "",
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all in parallel
      const [statusRes, resultsRes, signalsData] = await Promise.all([
        api.scanner.status().catch(e => ({ ok: false, running: false, error: e.message } as ScannerStatus)),
        api.scanner.results(50).catch(e => ({ ok: false, count: 0, results: [], error: e.message })),
        api.signals({ limit: 50 }).catch(() => []),
      ])

      setScannerStatus(statusRes)
      setScannerResults(resultsRes.results || [])
      setOldSignals(signalsData)

    } catch (e: any) {
      setError(e.message || "Алдаа гарлаа")
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle entry toggle
  const handleEntryToggle = useCallback(async (signalId: string, taken: boolean) => {
    try {
      // Optimistic update
      setOldSignals((prev) =>
        prev.map((s) => s.signal_id === signalId ? { ...s, entry_taken: taken } : s)
      )

      await api.updateSignalEntry(signalId, taken)

      toast({
        title: taken ? "Entry Taken ✅" : "Entry Removed ❌",
        description: "Signal tracking updated"
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update tracking",
        variant: "destructive"
      })
      // Revert on error (fetch fresh data)
      fetchData()
    }
  }, [fetchData, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds when scanner is running
  useEffect(() => {
    if (!scannerStatus?.running) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [scannerStatus?.running, fetchData])

  // Transform and merge signals
  const unifiedSignals = useMemo(() => {
    const scannerMapped = scannerResults.map(mapScannerResultToUnified)
    const signalsMapped = oldSignals.map(mapOldSignalToUnified)
    return mergeSignals(scannerMapped, signalsMapped)
  }, [scannerResults, oldSignals])

  // Filter signals based on active tab and filters
  const filteredSignals = useMemo(() => {
    let signals = unifiedSignals

    // Tab filter
    if (activeTab === "scanner") {
      signals = signals.filter(s => s.source === "scanner")
    } else if (activeTab === "signals") {
      signals = signals.filter(s => s.source === "signals")
    }

    // Additional filters
    signals = signals.filter(signal => {
      if (filters.symbol !== "all" && signal.symbol !== filters.symbol) return false
      if (filters.direction !== "all" && signal.direction !== filters.direction) return false
      if (filters.rrMin && signal.rr !== undefined && signal.rr < parseFloat(filters.rrMin)) return false
      if (filters.rrMax && signal.rr !== undefined && signal.rr > parseFloat(filters.rrMax)) return false
      return true
    })

    return signals
  }, [unifiedSignals, activeTab, filters])

  // Counts for tabs
  const scannerCount = useMemo(() =>
    unifiedSignals.filter(s => s.source === "scanner").length,
    [unifiedSignals]
  )
  const signalsCount = useMemo(() =>
    unifiedSignals.filter(s => s.source === "signals").length,
    [unifiedSignals]
  )

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    const syms = new Set(unifiedSignals.map(s => s.symbol))
    return Array.from(syms).sort()
  }, [unifiedSignals])

  if (error && !loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Signals & Setups</h1>
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Signals & Setups
            </h1>
            <p className="text-muted-foreground">
              Scanner setup болон бусад дохионууд
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/scanner">
                <Activity className="h-4 w-4 mr-2" />
                Scanner
              </Link>
            </Button>
          </div>
        </div>

        {/* Health Strip */}
        <ScannerHealthStrip
          status={scannerStatus}
          loading={loading}
          onRefresh={fetchData}
        />

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">
                Бүгд ({unifiedSignals.length})
              </TabsTrigger>
              <TabsTrigger value="scanner">
                <Zap className="h-4 w-4 mr-1" />
                Scanner ({scannerCount})
              </TabsTrigger>
              <TabsTrigger value="signals">
                Signals ({signalsCount})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filters */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Шүүлтүүр
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Symbol</label>
                  <Select
                    value={filters.symbol}
                    onValueChange={(v) => setFilters(f => ({ ...f, symbol: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүгд</SelectItem>
                      {uniqueSymbols.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Чиглэл</label>
                  <Select
                    value={filters.direction}
                    onValueChange={(v) => setFilters(f => ({ ...f, direction: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүгд</SelectItem>
                      <SelectItem value="long">LONG</SelectItem>
                      <SelectItem value="short">SHORT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">RR Min</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={filters.rrMin}
                    onChange={(e) => setFilters(f => ({ ...f, rrMin: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">RR Max</label>
                  <Input
                    type="number"
                    placeholder="10.0"
                    value={filters.rrMax}
                    onChange={(e) => setFilters(f => ({ ...f, rrMax: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <TabsContent value="all" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Ачааллаж байна...</p>
                </CardContent>
              </Card>
            ) : filteredSignals.length === 0 ? (
              scannerCount === 0 ? <EmptyScannerState /> : <EmptySignalsState />
            ) : (
            ): (
                <UnifiedSignalsTable signals = { filteredSignals } onToggle = { handleEntryToggle } />
            )}
          </TabsContent>

          <TabsContent value="scanner" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : filteredSignals.length === 0 ? (
              <EmptyScannerState />
            ) : (
              <UnifiedSignalsTable signals={filteredSignals} onToggle={handleEntryToggle} />
            )}
          </TabsContent>

          <TabsContent value="signals" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : filteredSignals.length === 0 ? (
              <EmptySignalsState />
            ) : (
              <UnifiedSignalsTable signals={filteredSignals} onToggle={handleEntryToggle} />
            )}
          </TabsContent>
        </Tabs>

        {/* Low Coverage Warning */}
        {filteredSignals.some(hasLowCoverage) && (
          <Card className="border-yellow-500/30 bg-yellow-950/10">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Зарим setup дээр data coverage бага байна. 90 хоног сонгох эсвэл 1H/4H timeframe ашиглана уу.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
