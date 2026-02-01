"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
  lastTs?: string
}

const rangeOptions = [
  { label: "7 хоног", value: "7" },
  { label: "30 хоног", value: "30" },
  { label: "90 хоног", value: "90" },
  { label: "180 хоног", value: "180" },
  { label: "365 хоног", value: "365" },
  { label: "Бүгд", value: "all" },
]

export default function PerformancePage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState("30")
  const [oldSignals, setOldSignals] = useState<SignalPayloadPublicV1[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Use userSignals (Firestore) instead of signals (VPS backend)
      const signalsRes = await api.userSignals({ limit: 500 }).catch(() => [])
      setOldSignals((signalsRes as SignalPayloadPublicV1[]) || [])
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
    if (rangeDays === "all") return unifiedSignals
    const days = Number(rangeDays)
    if (!Number.isFinite(days)) return unifiedSignals
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    return unifiedSignals.filter(signal => {
      const ts = new Date(signal.ts).getTime()
      return Number.isFinite(ts) ? ts >= since : false
    })
  }, [unifiedSignals, rangeDays])

  const setupSummaries = useMemo<SetupSummary[]>(() => {
    const map = new Map<string, SetupSummary>()
    for (const signal of filteredSignals) {
      const name = signal.strategyName || signal.strategyId || "Unknown"
      const summary = map.get(name) || { name, total: 0, tp: 0, sl: 0, pending: 0 }
      summary.total += 1

      if (signal.outcome === "win") summary.tp += 1
      else if (signal.outcome === "loss") summary.sl += 1
      else summary.pending += 1

      if (!summary.lastTs || new Date(signal.ts).getTime() > new Date(summary.lastTs).getTime()) {
        summary.lastTs = signal.ts
      }

      map.set(name, summary)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredSignals])

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

  const winRate = useMemo(() => {
    const decided = totals.tp + totals.sl
    if (decided === 0) return null
    return (totals.tp / decided) * 100
  }, [totals])

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
            <h1 className="text-2xl sm:text-3xl font-bold">History</h1>
            <p className="text-sm text-muted-foreground">Setup бүрийн TP/SL түүх болон үр дүн</p>
          </div>
          <div className="w-full sm:w-56">
            <label className="text-xs font-medium text-muted-foreground">Хугацаа</label>
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

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Нийт setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold">{totals.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">TP болсон</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xl sm:text-2xl font-bold">{totals.tp}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">SL болсон</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xl sm:text-2xl font-bold">{totals.sl}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Хүлээгдэж буй</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold">{totals.pending}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                TP rate: {winRate !== null ? `${winRate.toFixed(1)}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Setup түүх</CardTitle>
            <CardDescription>Strategy бүрийн TP/SL тоо болон сүүлийн огноо</CardDescription>
          </CardHeader>
          <CardContent>
            {setupSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setup</TableHead>
                    <TableHead className="text-right">Нийт</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Сүүлд</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setupSummaries.map(item => (
                    <TableRow key={item.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.total}</TableCell>
                      <TableCell className="text-right text-green-500">{item.tp}</TableCell>
                      <TableCell className="text-right text-red-500">{item.sl}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.pending}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Сүүлийн setup‑ууд</CardTitle>
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
                    <TableHead className="text-right">RR</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Strategy</TableHead>
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
                      <TableCell className="text-right">
                        {signal.rr !== undefined ? signal.rr.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {signal.sl !== undefined && signal.sl !== 0 ? signal.sl : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {signal.tp !== undefined && signal.tp !== 0 ? signal.tp : "—"}
                      </TableCell>
                      <TableCell>
                        {signal.outcome ? (
                          <Badge
                            variant={
                              signal.outcome === "win"
                                ? "default"
                                : signal.outcome === "loss"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {signal.outcome.toUpperCase()}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {signal.strategyName || signal.strategyId || "—"}
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
