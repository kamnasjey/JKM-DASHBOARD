"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Calendar, CheckCircle2, Clock, XCircle, Check, X, Minus, Languages } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import {
  type UnifiedSignal,
  mapOldSignalToUnified,
  formatTimestamp,
} from "@/lib/signals/unified"
import type { SignalPayloadPublicV1 } from "@/lib/types"

interface SetupSummary {
  name: string
  total: number
  tp: number
  sl: number
  pending: number
  // Taken entries stats (for win rate calculation)
  takenTotal: number
  takenTp: number
  takenSl: number
  takenPending: number
  lastTs?: string
}

// Entry tracking cell component
function EntryTrackingCell({
  signalId,
  entryTaken,
  onUpdate,
}: {
  signalId: string
  entryTaken?: boolean | null
  onUpdate: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleClick = async (value: boolean | null) => {
    console.log("[EntryTracking] Updating signal:", signalId, "value:", value)
    setLoading(true)
    try {
      const result = await api.updateSignalEntry(signalId, value)
      console.log("[EntryTracking] Result:", result)
      toast({
        title: "Хадгалагдлаа",
        description: `Signal ${signalId.slice(0, 20)}... updated`,
      })
      onUpdate()
    } catch (e: any) {
      console.error("[EntryTracking] Failed:", e)
      toast({
        title: "Алдаа",
        description: e?.message || "Failed to update",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (entryTaken === true) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-green-500 hover:text-red-500"
        onClick={() => handleClick(null)}
        disabled={loading}
      >
        <Check className="h-4 w-4" />
      </Button>
    )
  }

  if (entryTaken === false) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-red-500 hover:text-green-500"
        onClick={() => handleClick(null)}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 hover:text-green-500 hover:bg-green-500/10"
        onClick={() => handleClick(true)}
        disabled={loading}
        title="Орсон"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 hover:text-red-500 hover:bg-red-500/10"
        onClick={() => handleClick(false)}
        disabled={loading}
        title="Алгассан"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// Outcome cell component - displays automatic outcome (no manual buttons)
function OutcomeCell({
  outcome,
  entryTaken,
}: {
  outcome?: "win" | "loss" | "expired" | "pending" | null
  entryTaken?: boolean | null
}) {
  // Only show outcome if entry was taken
  if (entryTaken !== true) {
    return <span className="text-muted-foreground">—</span>
  }

  if (outcome === "win") {
    return (
      <Badge variant="default" className="bg-green-600">
        TP
      </Badge>
    )
  }

  if (outcome === "loss") {
    return (
      <Badge variant="destructive">
        SL
      </Badge>
    )
  }

  // Pending - waiting for automatic outcome detection
  return (
    <span className="inline-flex items-center gap-1 text-yellow-500 text-sm">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  )
}

const rangeOptions = [
  { label: "7 хоног", value: "7" },
  { label: "30 хоног", value: "30" },
  { label: "90 хоног", value: "90" },
  { label: "180 хоног", value: "180" },
  { label: "365 хоног", value: "365" },
  { label: "Бүгд", value: "all" },
]

// Check if a string looks like a Firestore document ID (random alphanumeric)
function looksLikeId(str: string): boolean {
  return /^[a-zA-Z0-9]{15,}$/.test(str)
}

function getStrategyDisplayName(
  signal: UnifiedSignal,
  strategyMap: Record<string, string>
): string {
  // Try dynamic ID mappings from Firestore strategies
  const possibleIds = [signal.strategyId, signal.strategyName].filter(Boolean)
  for (const id of possibleIds) {
    if (id && strategyMap[id]) {
      return strategyMap[id]
    }
  }

  // If strategyName exists and doesn't look like an ID, use it
  if (signal.strategyName && !looksLikeId(signal.strategyName)) {
    return signal.strategyName
  }

  // Fallback to shortened ID
  const fallbackId = signal.strategyId || signal.strategyName
  if (fallbackId) {
    return `Strategy ${fallbackId.slice(0, 6)}...`
  }
  return "Unknown"
}

export default function PerformancePage() {
  useAuthGuard(true)

  const { toast } = useToast()

  // Language toggle
  const [lang, setLang] = useState<"en" | "mn">("mn")
  const t = (en: string, mn: string) => (lang === "mn" ? mn : en)

  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState("30")
  const [oldSignals, setOldSignals] = useState<SignalPayloadPublicV1[]>([])
  const [strategyMap, setStrategyMap] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch signals and strategies in parallel
      // Note: api.userSignals() returns normalized array directly (not { signals: [] })
      const [signalsRes, strategiesRes] = await Promise.all([
        api.userSignals({ limit: 500 }).catch(() => []),
        api.strategiesV2.list({ limit: 100 }).catch(() => ({ strategies: [] })),
      ])
      setOldSignals(Array.isArray(signalsRes) ? signalsRes : [])

      // Build strategy ID → name mapping from Firestore strategies
      const strategies = (strategiesRes as any)?.strategies || []
      const mapping: Record<string, string> = {}
      for (const s of strategies) {
        const id = s.id || s.strategy_id
        const name = s.name || s.strategy_name
        if (id && name) {
          mapping[id] = name
        }
      }
      setStrategyMap(mapping)
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Өгөгдөл ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const unifiedSignals = useMemo<UnifiedSignal[]>(() => {
    return oldSignals.map(mapOldSignalToUnified)
  }, [oldSignals])

  const filteredSignals = useMemo(() => {
    let signals = unifiedSignals

    // Filter by date range
    if (rangeDays !== "all") {
      const days = Number(rangeDays)
      if (Number.isFinite(days)) {
        const since = Date.now() - days * 24 * 60 * 60 * 1000
        signals = signals.filter(signal => {
          const ts = new Date(signal.ts).getTime()
          return Number.isFinite(ts) ? ts >= since : false
        })
      }
    }

    // Deduplicate: same symbol+direction within 60 minutes = duplicate
    const deduped: typeof signals = []
    for (const signal of signals) {
      const ts = new Date(signal.ts).getTime()
      const isDupe = deduped.some(d => {
        if (d.symbol !== signal.symbol) return false
        if ((d.direction || "").toLowerCase() !== (signal.direction || "").toLowerCase()) return false
        const dTs = new Date(d.ts).getTime()
        return Math.abs(dTs - ts) < 3600000 // 60 minutes
      })
      if (!isDupe) deduped.push(signal)
    }

    return deduped
  }, [unifiedSignals, rangeDays])

  const setupSummaries = useMemo<SetupSummary[]>(() => {
    const map = new Map<string, SetupSummary>()
    for (const signal of filteredSignals) {
      const name = getStrategyDisplayName(signal, strategyMap)
      const summary = map.get(name) || {
        name, total: 0, tp: 0, sl: 0, pending: 0,
        takenTotal: 0, takenTp: 0, takenSl: 0, takenPending: 0
      }
      summary.total += 1

      if (signal.outcome === "win") summary.tp += 1
      else if (signal.outcome === "loss") summary.sl += 1
      else summary.pending += 1

      // Track taken entries separately
      if (signal.entry_taken === true) {
        summary.takenTotal += 1
        if (signal.outcome === "win") summary.takenTp += 1
        else if (signal.outcome === "loss") summary.takenSl += 1
        else summary.takenPending += 1
      }

      if (!summary.lastTs || new Date(signal.ts).getTime() > new Date(summary.lastTs).getTime()) {
        summary.lastTs = signal.ts
      }

      map.set(name, summary)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredSignals, strategyMap])

  // Taken entries only (entry_taken = true)
  const takenEntries = useMemo(() => {
    return filteredSignals.filter(s => s.entry_taken === true)
  }, [filteredSignals])

  // Stats based on taken entries only
  const takenStats = useMemo(() => {
    const tp = takenEntries.filter(s => s.outcome === "win").length
    const sl = takenEntries.filter(s => s.outcome === "loss").length
    const pending = takenEntries.filter(s => s.outcome !== "win" && s.outcome !== "loss").length
    return { total: takenEntries.length, tp, sl, pending }
  }, [takenEntries])

  // Win rate from taken entries only
  const winRate = useMemo(() => {
    const decided = takenStats.tp + takenStats.sl
    if (decided === 0) return null
    return (takenStats.tp / decided) * 100
  }, [takenStats])

  // All signals stats (for reference)
  const totals = useMemo(() => {
    return setupSummaries.reduce(
      (acc, item) => {
        acc.total += item.total
        acc.tp += item.tp
        acc.sl += item.sl
        acc.pending += item.pending
        return acc
      },
      { total: 0, tp: 0, sl: 0, pending: 0 },
    )
  }, [setupSummaries])

  const recentSignals = useMemo(() => {
    return [...filteredSignals]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 50)
  }, [filteredSignals])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("History", "Түүх")}</h1>
            <p className="text-sm text-muted-foreground">{t("TP/SL history and results for each setup", "Setup бүрийн TP/SL түүх болон үр дүн")}</p>
          </div>
          <div className="flex items-end gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "mn" ? "en" : "mn")}
              className="gap-1.5"
            >
              <Languages className="h-4 w-4" />
              {lang === "mn" ? "EN" : "MN"}
            </Button>
            <div className="w-full sm:w-56">
              <label className="text-xs font-medium text-muted-foreground">{t("Period", "Хугацаа")}</label>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Хугацаа сонгох" />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Нийт setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold">{totals.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Орсон: {takenStats.total}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">TP болсон</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xl sm:text-2xl font-bold text-green-500">{takenStats.tp}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Орсон entry‑ээс
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">SL болсон</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xl sm:text-2xl font-bold text-red-500">{takenStats.sl}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Орсон entry‑ээс
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Хүлээгдэж буй</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-xl sm:text-2xl font-bold">{takenStats.pending}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Орсон, үр дүн хүлээгдэж буй
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm font-medium">Win Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold">
                  {winRate !== null ? `${winRate.toFixed(1)}%` : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {takenStats.tp + takenStats.sl} trade‑ээс
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Setup түүх</CardTitle>
            <CardDescription>Strategy бүрийн орсон арилжаа, TP/SL тоо, Win Rate</CardDescription>
          </CardHeader>
          <CardContent>
            {setupSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Нийт</TableHead>
                    <TableHead className="text-right">Орсон</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead>Сүүлд</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setupSummaries.map(item => {
                    const decidedCount = item.takenTp + item.takenSl
                    const itemWinRate = decidedCount > 0 ? (item.takenTp / decidedCount) * 100 : null
                    return (
                      <TableRow key={item.name}>
                        <TableCell>
                          <span className="font-medium">{item.name}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.total}</TableCell>
                        <TableCell className="text-right font-medium">{item.takenTotal}</TableCell>
                        <TableCell className="text-right text-green-500">{item.takenTp}</TableCell>
                        <TableCell className="text-right text-red-500">{item.takenSl}</TableCell>
                        <TableCell className="text-right font-bold">
                          {itemWinRate !== null ? `${itemWinRate.toFixed(0)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.lastTs ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatTimestamp(item.lastTs)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Taken Entries Section */}
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Орсон арилжаа
            </CardTitle>
            <CardDescription>
              Entry авсан setup‑ууд — Win Rate зөвхөн эндээс тооцогдоно
            </CardDescription>
          </CardHeader>
          <CardContent>
            {takenEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Одоогоор орсон арилжаа байхгүй. Доорх жагсаалтаас &quot;Орсон&quot; товч дарж тэмдэглэнэ үү.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Чиглэл</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead className="text-right">RR</TableHead>
                    <TableHead>Үр дүн</TableHead>
                    <TableHead>Огноо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {takenEntries
                    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
                    .map(signal => (
                    <TableRow key={signal.id}>
                      <TableCell className="font-mono">{signal.symbol}</TableCell>
                      <TableCell>{signal.timeframe}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            signal.direction === "long"
                              ? "default"
                              : signal.direction === "short"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {signal.direction === "long"
                            ? "LONG"
                            : signal.direction === "short"
                              ? "SHORT"
                              : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {signal.entry !== undefined && signal.entry !== 0
                          ? signal.entry > 100 ? signal.entry.toFixed(2) : signal.entry.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {signal.sl !== undefined && signal.sl !== 0
                          ? signal.sl > 100 ? signal.sl.toFixed(2) : signal.sl.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-400">
                        {signal.tp !== undefined && signal.tp !== 0
                          ? signal.tp > 100 ? signal.tp.toFixed(2) : signal.tp.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {signal.rr !== undefined ? signal.rr.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell>
                        <OutcomeCell
                          outcome={signal.outcome}
                          entryTaken={signal.entry_taken}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(signal.ts)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Бүх setup‑ууд</CardTitle>
            <CardDescription>Symbol, TF, чиглэл, RR, outcome‑ийг дэлгэрэнгүй харуулна</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>TF</TableHead>
                    <TableHead>Чиглэл</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead className="text-right">RR</TableHead>
                    <TableHead>Орсон</TableHead>
                    <TableHead>Үр дүн</TableHead>
                    <TableHead>Огноо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSignals.map(signal => (
                    <TableRow key={signal.id}>
                      <TableCell className="font-mono">{signal.symbol}</TableCell>
                      <TableCell>{signal.timeframe}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            signal.direction === "long"
                              ? "default"
                              : signal.direction === "short"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {signal.direction === "long"
                            ? "LONG"
                            : signal.direction === "short"
                              ? "SHORT"
                              : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {signal.entry !== undefined && signal.entry !== 0
                          ? signal.entry > 100 ? signal.entry.toFixed(2) : signal.entry.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {signal.sl !== undefined && signal.sl !== 0
                          ? signal.sl > 100 ? signal.sl.toFixed(2) : signal.sl.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-400">
                        {signal.tp !== undefined && signal.tp !== 0
                          ? signal.tp > 100 ? signal.tp.toFixed(2) : signal.tp.toFixed(5)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {signal.rr !== undefined ? signal.rr.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell>
                        <EntryTrackingCell
                          signalId={signal.id.replace("signals:", "")}
                          entryTaken={signal.entry_taken}
                          onUpdate={fetchData}
                        />
                      </TableCell>
                      <TableCell>
                        <OutcomeCell
                          outcome={signal.outcome}
                          entryTaken={signal.entry_taken}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(signal.ts)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
