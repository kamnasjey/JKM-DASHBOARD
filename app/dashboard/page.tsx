"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Activity, BarChart3, Layers3, RefreshCw, Wifi, WifiOff, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard } from "@/components/metric-card"
import { SignalsTable } from "@/components/signals-table"
import { useToast } from "@/hooks/use-toast"
import { useWebSocketSignals } from "@/hooks/use-websocket-signals"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // WebSocket real-time signals
  const { 
    signals: wsSignals, 
    newSignals, 
    connected: wsConnected, 
    lastUpdate: wsLastUpdate,
    clearNewSignals 
  } = useWebSocketSignals()

  const [metrics, setMetrics] = useState<any>(null)
  const [activeStrategies, setActiveStrategies] = useState<number | null>(null)
  const [recentSignals, setRecentSignals] = useState<SignalPayloadPublicV1[]>([])
  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Show toast when new signals arrive via WebSocket
  useEffect(() => {
    if (newSignals.length > 0) {
      newSignals.forEach((signal) => {
        toast({
          title: `🔔 Шинэ дохио: ${signal.symbol}`,
          description: `${signal.direction} @ ${signal.entry} | RR: ${signal.rr?.toFixed(2) || "N/A"}`,
        })
      })
      clearNewSignals()
    }
  }, [newSignals, toast, clearNewSignals])
  
  // Use WS signals if available, otherwise HTTP
  const displaySignals = useMemo(() => {
    if (wsConnected && wsSignals.length > 0) {
      // Return last 10 signals from WS
      return wsSignals.slice(-10).reverse() as SignalPayloadPublicV1[]
    }
    return recentSignals
  }, [wsConnected, wsSignals, recentSignals])

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

  const lastScanText = useMemo(() => {
    const raw = (engineStatus as any)?.last_scan_ts
    if (raw === null || raw === undefined) return null

    const num = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN
    if (!Number.isFinite(num)) return null
    if (num <= 0) return null

    // Heuristic: if timestamp looks like seconds, convert to ms.
    const ms = num < 1_000_000_000_000 ? num * 1000 : num
    if (ms < 946_684_800_000) return null // < year 2000 => probably invalid

    return new Date(ms).toLocaleString("mn-MN")
  }, [engineStatus])

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
            <CardTitle className="flex items-center gap-2">
              System
              {/* WebSocket Connection Status */}
              <Badge 
                variant={wsConnected ? "default" : "secondary"} 
                className={`ml-auto flex items-center gap-1 text-xs ${wsConnected ? "bg-green-600" : ""}`}
              >
                {wsConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Polling
                  </>
                )}
              </Badge>
            </CardTitle>
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
                  {lastScanText && (
                    <div>
                      Сүүлийн скан: <span className="font-mono text-xs">{lastScanText}</span>
                    </div>
                  )}
                </div>
              ) : (
                "Уншиж байна…"
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {wsConnected ? (
                <span className="text-green-600">Real-time updates · {wsLastUpdate?.toLocaleTimeString() || ""}</span>
              ) : (
                "Signals auto refresh: 60s · Engine: 5s"
              )}
            </div>
          </CardContent>
        </Card>

        <SignalsTable signals={displaySignals} limit={10} />
      </div>
    </DashboardLayout>
  )
}
