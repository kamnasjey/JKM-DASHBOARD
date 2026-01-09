"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Activity, BarChart3, Play, Square, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { JourneyStrip } from "@/components/journey-strip"
import { MetricCard } from "@/components/metric-card"
import { SignalsTable } from "@/components/signals-table"
import { ExplainPanel } from "@/components/explain-panel"
import { ChartPlaceholder } from "@/components/chart-placeholder"
import { ApiStatusBanner } from "@/components/api-status-banner"
import { useMetrics } from "@/hooks/use-metrics"
import { useSignals } from "@/hooks/use-signals"
import { useSymbols } from "@/hooks/use-symbols"
import { api } from "@/lib/api"
import type { Annotations } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const { metrics, error: metricsError, refresh: refreshMetrics } = useMetrics()
  const { symbols, error: symbolsError } = useSymbols()
  const defaultSymbol = symbols[0] || "EURUSD"
  const { signals, error: signalsError, refresh: refreshSignals } = useSignals({ limit: 50, symbol: defaultSymbol })
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
  const hasApiError = metricsError || symbolsError || signalsError

  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [actionLog, setActionLog] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      fetchEngineStatus()
    }
  }, [status])

  const fetchEngineStatus = async () => {
    try {
      const data = await api.engineStatus()
      setEngineStatus(data)
    } catch (err: any) {
      console.error("[v0] Failed to fetch engine status:", err)
    }
  }

  useEffect(() => {
    if (defaultSymbol) {
      api
        .annotations(defaultSymbol)
        .then(setAnnotations)
        .catch((err) => console.error("[v0] Failed to fetch annotations:", err))
    }
  }, [defaultSymbol])

  const latestSignal = signals[0] || null

  const handleRetry = () => {
    refreshMetrics()
    refreshSignals()
    window.location.reload()
  }

  const handleStartEngine = async () => {
    setIsLoading(true)
    try {
      const result = await api.startScan()
      setActionLog(`✓ Engine started: ${JSON.stringify(result)}`)
      toast({ title: "Амжилттай", description: "Engine эхэллээ" })
      await fetchEngineStatus()
    } catch (err: any) {
      setActionLog(`✗ Error: ${err.message}`)
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopEngine = async () => {
    setIsLoading(true)
    try {
      const result = await api.stopScan()
      setActionLog(`✓ Engine stopped: ${JSON.stringify(result)}`)
      toast({ title: "Амжилттай", description: "Engine зогслоо" })
      await fetchEngineStatus()
    } catch (err: any) {
      setActionLog(`✗ Error: ${err.message}`)
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualScan = async () => {
    setIsLoading(true)
    try {
      const result = await api.manualScan()
      setActionLog(`✓ Manual scan triggered: ${JSON.stringify(result)}`)
      toast({ title: "Амжилттай", description: "Гарын авлага скан эхэллээ" })
      await fetchEngineStatus()
    } catch (err: any) {
      setActionLog(`✗ Error: ${err.message}`)
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
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
        {hasApiError && <ApiStatusBanner onRetry={handleRetry} />}

        <Card>
          <CardHeader>
            <CardTitle>Тавтай морил, {session.user?.name || session.user?.email}</CardTitle>
            <CardDescription>Engine удирдлага ба статус</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Engine Status */}
            <div className="rounded-md border p-4">
              <div className="mb-2 text-sm font-medium">Engine Status</div>
              {engineStatus ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    Төлөв:{" "}
                    <span className={engineStatus.running ? "text-green-500" : "text-red-500"}>
                      {engineStatus.running ? "Ажиллаж байна" : "Зогссон"}
                    </span>
                  </div>
                  {engineStatus.last_scan_ts && (
                    <div>Сүүлийн скан: {new Date(engineStatus.last_scan_ts).toLocaleString()}</div>
                  )}
                  {engineStatus.last_error && <div className="text-red-500">Алдаа: {engineStatus.last_error}</div>}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Статус уншиж байна...</div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleStartEngine} disabled={isLoading} size="sm">
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
              <Button onClick={handleStopEngine} disabled={isLoading} variant="outline" size="sm">
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
              <Button onClick={handleManualScan} disabled={isLoading} variant="secondary" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Manual Scan
              </Button>
            </div>

            {/* Action Log */}
            {actionLog && <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs">{actionLog}</div>}
          </CardContent>
        </Card>

        {/* Journey Strip */}
        <JourneyStrip />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Winrate"
            value={`${(metrics?.winrate || 0).toFixed(1)}%`}
            subtitle="Сүүлийн 7 хоногт"
            icon={TrendingUp}
          />
          <MetricCard
            title="Wins / Losses"
            value={`${metrics?.wins || 0} / ${metrics?.losses || 0}`}
            subtitle="Нийт шийдэгдсэн"
            icon={TrendingDown}
          />
          <MetricCard
            title="Pending Signals"
            value={metrics?.pending || 0}
            subtitle="Хүлээгдэж байгаа"
            icon={Activity}
          />
          <MetricCard title="Total Signals" value={metrics?.total || 0} subtitle="Нийт дохио" icon={BarChart3} />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <ChartPlaceholder symbol={defaultSymbol} />
            <SignalsTable signals={signals} limit={10} />
          </div>

          <div className="lg:col-span-4">
            <ExplainPanel signal={latestSignal} annotations={annotations} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
