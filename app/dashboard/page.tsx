"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Activity, BarChart3, Layers3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard } from "@/components/metric-card"
import { SignalsTable } from "@/components/signals-table"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [metrics, setMetrics] = useState<any>(null)
  const [activeStrategies, setActiveStrategies] = useState<number | null>(null)
  const [recentSignals, setRecentSignals] = useState<SignalPayloadPublicV1[]>([])
  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const winRateText = useMemo(() => {
    const raw = metrics?.win_rate ?? metrics?.winrate
    if (raw === null || raw === undefined) return "—"
    const num = Number(raw)
    if (!Number.isFinite(num)) return "—"

    // Backend may return 0..1 or 0..100
    const pct = num <= 1 ? num * 100 : num
    return `${pct.toFixed(1)}%`
  }, [metrics])

  const totalSignalsText = useMemo(() => {
    const direct = metrics?.total_signals ?? metrics?.total
    if (direct !== null && direct !== undefined) return String(direct)

    const wins = Number(metrics?.wins ?? 0)
    const losses = Number(metrics?.losses ?? 0)
    const pending = Number(metrics?.pending ?? 0)
    const sum = wins + losses + pending
    return sum > 0 ? String(sum) : "—"
  }, [metrics])

  const refreshDashboard = async () => {
    setLoading(true)
    try {
      const [m, s, sigs, eng] = await Promise.all([
        api.metrics(),
        api.strategies(),
        api.signals({ limit: 10 }),
        api.engineStatus(),
      ])

      setMetrics(m)

      const strategies = (s as any)?.strategies
      if (Array.isArray(strategies)) {
        setActiveStrategies(strategies.filter((x) => x?.enabled).length)
      } else {
        setActiveStrategies(null)
      }

      const normalizedSignals = Array.isArray(sigs) ? sigs : ((sigs as any)?.signals ?? [])
      setRecentSignals(normalizedSignals as SignalPayloadPublicV1[])

      setEngineStatus(eng)
    } catch (err: any) {
      toast({
        title: "Алдаа гарлаа",
        description: err?.message ?? "Dashboard ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return
    refreshDashboard()

    const engineInterval = setInterval(() => {
      api.engineStatus().then(setEngineStatus).catch(() => {})
    }, 5000)

    const signalsInterval = setInterval(() => {
      api
        .signals({ limit: 10 })
        .then((sigs) => setRecentSignals(Array.isArray(sigs) ? (sigs as any) : ((sigs as any)?.signals ?? [])))
        .catch(() => {})
    }, 60_000)

    return () => {
      clearInterval(engineInterval)
      clearInterval(signalsInterval)
    }
  }, [status])

  const handleManualScan = async () => {
    setLoading(true)
    try {
      const result = await api.manualScan()
      toast({
        title: "Амжилттай",
        description: `Scan эхэллээ${result?.scan_id ? ` (${result.scan_id})` : ""}`,
      })

      // Refresh signals & engine status right after scan
      const [eng, sigs] = await Promise.all([api.engineStatus(), api.signals({ limit: 10 })])
      setEngineStatus(eng)
      setRecentSignals(Array.isArray(sigs) ? (sigs as any) : ((sigs as any)?.signals ?? []))
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Ачааллаж байна...</div>
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Сайн байна уу{session?.user?.email ? `, ${session.user.email}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleManualScan} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Now
            </Button>
            <Button variant="outline" onClick={refreshDashboard} disabled={loading}>
              Шинэчлэх
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Нийт дохио" value={totalSignalsText} subtitle="Сүүлийн статистик" icon={BarChart3} />
          <MetricCard title="Win rate" value={winRateText} subtitle="Ялалтын хувь" icon={Activity} />
          <MetricCard
            title="Идэвхтэй стратеги"
            value={activeStrategies === null ? "—" : activeStrategies}
            subtitle="Enabled стратегийн тоо"
            icon={Layers3}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Engine төлөв ба сүүлийн скан</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {engineStatus ? (
                <div className="space-y-1">
                  <div>
                    Төлөв: <span className={engineStatus.running ? "text-emerald-600" : "text-destructive"}>
                      {engineStatus.running ? "Ажиллаж байна" : "Зогссон"}
                    </span>
                  </div>
                  {engineStatus.last_scan_ts && (
                    <div>
                      Сүүлийн скан: <span className="font-mono text-xs">{new Date(engineStatus.last_scan_ts).toLocaleString("mn-MN")}</span>
                    </div>
                  )}
                </div>
              ) : (
                "Уншиж байна…"
              )}
            </div>
            <div className="text-xs text-muted-foreground">Signals auto refresh: 60s · Engine: 5s</div>
          </CardContent>
        </Card>

        <SignalsTable signals={recentSignals} limit={10} />
      </div>
    </DashboardLayout>
  )
}
