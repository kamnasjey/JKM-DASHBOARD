"use client"

import { useState, useEffect, useMemo } from "react"
import { BarChart3, TrendingUp, TrendingDown, Activity, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

interface DayMetric {
  date: string
  ok: number
  none: number
  total: number
  hit_rate: number | null
}

interface SymbolMetric {
  ok: number
  none: number
  total: number
  hit_rate: number | null
}

interface DetailedMetrics {
  ok: boolean
  total_signals: number
  by_symbol: Record<string, SymbolMetric>
  by_timeframe: Record<string, SymbolMetric>
  by_day: DayMetric[]
  by_direction: {
    BUY: { ok: number; none: number }
    SELL: { ok: number; none: number }
  }
}

export default function PerformancePage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DetailedMetrics | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      const data = await api.detailedMetrics()
      setMetrics(data)
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Metrics ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const overallHitRate = useMemo(() => {
    if (!metrics) return null
    const { by_direction } = metrics
    const totalOk = by_direction.BUY.ok + by_direction.SELL.ok
    const totalNone = by_direction.BUY.none + by_direction.SELL.none
    if (totalOk + totalNone === 0) return null
    return (totalOk / (totalOk + totalNone)) * 100
  }, [metrics])

  const sortedSymbols = useMemo(() => {
    if (!metrics?.by_symbol) return []
    return Object.entries(metrics.by_symbol)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
  }, [metrics])

  const sortedTimeframes = useMemo(() => {
    if (!metrics?.by_timeframe) return []
    return Object.entries(metrics.by_timeframe).sort((a, b) => b[1].total - a[1].total)
  }, [metrics])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!metrics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Өгөгдөл байхгүй</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">Дохионы гүйцэтгэлийн дэлгэрэнгүй статистик</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Нийт дохио</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold">{metrics.total_signals}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Hit Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl sm:text-2xl font-bold">
                  {overallHitRate !== null ? `${overallHitRate.toFixed(1)}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">BUY дохио</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <span className="text-xl sm:text-2xl font-bold">
                  {metrics.by_direction.BUY.ok + metrics.by_direction.BUY.none}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.by_direction.BUY.ok} OK
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">SELL дохио</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                <span className="text-xl sm:text-2xl font-bold">
                  {metrics.by_direction.SELL.ok + metrics.by_direction.SELL.none}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.by_direction.SELL.ok} OK
              </p>
            </CardContent>
          </Card>
        </div>

        {/* By Symbol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Symbol-аар</CardTitle>
            <CardDescription>Топ 10 идэвхтэй symbol</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedSymbols.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <div className="space-y-3">
                {sortedSymbols.map(([symbol, stats]) => (
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
            )}
          </CardContent>
        </Card>

        {/* By Timeframe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Timeframe-аар</CardTitle>
            <CardDescription>Timeframe бүрийн гүйцэтгэл</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedTimeframes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortedTimeframes.map(([tf, stats]) => (
                  <div
                    key={tf}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <Badge variant="secondary">{tf}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.ok} OK / {stats.none} NONE
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {stats.hit_rate !== null ? `${(stats.hit_rate * 100).toFixed(0)}%` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats.total} нийт</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Өдөр бүрийн гүйцэтгэл</CardTitle>
            <CardDescription>Сүүлийн 30 өдрийн статистик</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.by_day.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <div className="space-y-2">
                {/* Simple bar chart representation */}
                <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                  {metrics.by_day.map((day) => {
                    const maxTotal = Math.max(...metrics.by_day.map((d) => d.total), 1)
                    const heightPercent = (day.total / maxTotal) * 100
                    const okPercent = day.total > 0 ? (day.ok / day.total) * 100 : 0
                    return (
                      <div
                        key={day.date}
                        className="flex-shrink-0 w-6 sm:w-8 flex flex-col items-center group relative"
                      >
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-primary to-primary/50 transition-all"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div
                            className="w-full bg-green-500 rounded-t"
                            style={{ height: `${okPercent}%` }}
                          />
                        </div>
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                          <p className="font-medium">{day.date}</p>
                          <p>OK: {day.ok} / Total: {day.total}</p>
                          <p>Hit: {day.hit_rate !== null ? `${(day.hit_rate * 100).toFixed(0)}%` : "—"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{metrics.by_day[0]?.date}</span>
                  <span>{metrics.by_day[metrics.by_day.length - 1]?.date}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>OK</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-primary/50" />
                    <span>NONE</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
