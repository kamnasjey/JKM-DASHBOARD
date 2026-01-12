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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

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

        {/* Daily Chart with Recharts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Өдөр бүрийн гүйцэтгэл</CardTitle>
            <CardDescription>Сүүлийн 30 өдрийн статистик</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.by_day.length === 0 ? (
              <p className="text-sm text-muted-foreground">Өгөгдөл байхгүй</p>
            ) : (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={metrics.by_day.map(day => ({
                      date: day.date.slice(5), // MM-DD format
                      OK: day.ok,
                      NONE: day.none,
                      hitRate: day.hit_rate !== null ? Math.round(day.hit_rate * 100) : null,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [value, name]}
                      labelFormatter={(label) => `Огноо: ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    />
                    <Bar dataKey="OK" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="NONE" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
