"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react"
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
import { useAuthGuard } from "@/lib/auth-guard"
import type { Annotations } from "@/lib/types"

export default function DashboardPage() {
  useAuthGuard(true)

  const { metrics, error: metricsError, refresh: refreshMetrics } = useMetrics()
  const { symbols, error: symbolsError } = useSymbols()
  const defaultSymbol = symbols[0] || "EURUSD"
  const { signals, error: signalsError, refresh: refreshSignals } = useSignals({ limit: 50, symbol: defaultSymbol })
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
  const hasApiError = metricsError || symbolsError || signalsError

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {hasApiError && <ApiStatusBanner onRetry={handleRetry} />}

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
          {/* Left: Chart & Setup */}
          <div className="space-y-6 lg:col-span-8">
            <ChartPlaceholder symbol={defaultSymbol} />
            <SignalsTable signals={signals} limit={10} />
          </div>

          {/* Right: AI Copilot */}
          <div className="lg:col-span-4">
            <ExplainPanel signal={latestSignal} annotations={annotations} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
