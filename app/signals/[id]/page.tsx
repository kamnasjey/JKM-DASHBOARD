"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExplainPanel } from "@/components/explain-panel"
import { JsonViewer } from "@/components/json-viewer"
import { CandleChart } from "@/components/candle-chart"
import { api } from "@/lib/api"
import { formatTimestamp } from "@/lib/utils-trading"
import { useAuthGuard } from "@/lib/auth-guard"
import type { SignalPayloadPublicV1 } from "@/lib/types"

export default function SignalDetailPage() {
  useAuthGuard(true)

  const params = useParams()
  const router = useRouter()
  const [signal, setSignal] = useState<SignalPayloadPublicV1 | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      api
        .signalDetail(params.id as string)
        .then((data) => {
          setSignal(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error("[v0] Failed to fetch signal detail:", err)
          setLoading(false)
        })
    }
  }, [params.id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!signal) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Дохио олдсонгүй</p>
          <Button onClick={() => router.push("/signals")} className="mt-4">
            Буцах
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">
                  {signal.symbol}
                </h1>
                <Badge variant={signal.direction === "BUY" ? "default" : "destructive"}>{signal.direction}</Badge>
                <Badge variant={signal.status === "OK" ? "default" : "secondary"}>{signal.status}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{formatTimestamp(signal.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Chart & Drawings */}
          <div className="space-y-6 lg:col-span-8">
            <CandleChart
              symbol={signal.symbol}
              tf={signal.timeframe || "M5"}
              overlays={signal.chart_drawings}
              entry={signal.entry}
              sl={signal.sl}
              tp={signal.tp}
            />

            {/* Chart Drawings */}
            <Card>
              <CardHeader>
                <CardTitle>Chart Drawings</CardTitle>
              </CardHeader>
              <CardContent>
                {signal.chart_drawings && signal.chart_drawings.length > 0 ? (
                  <div className="space-y-2">
                    {signal.chart_drawings.map((drawing) => (
                      <div
                        key={drawing.object_id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{drawing.kind}</Badge>
                          <span className="text-sm">{drawing.type}</span>
                          {drawing.label && <span className="text-sm text-muted-foreground">{drawing.label}</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {drawing.price && `${drawing.price.toFixed(5)}`}
                          {drawing.price_from &&
                            drawing.price_to &&
                            `${drawing.price_from.toFixed(5)} - ${drawing.price_to.toFixed(5)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chart drawing байхгүй</p>
                )}
              </CardContent>
            </Card>

            {/* Evidence JSON */}
            <JsonViewer data={signal.evidence} title="Evidence" />

            {/* Explain JSON */}
            {signal.explain && <JsonViewer data={signal.explain} title="Explain" />}
          </div>

          {/* Right: Explain Panel */}
          <div className="lg:col-span-4">
            <ExplainPanel signal={signal} />

            {/* Replay Mode Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Replay Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <h4 className="mb-2 text-sm font-semibold">1. Setup ойлгох</h4>
                    <p className="text-xs text-muted-foreground">
                      Chart дээр entry, sl, tp-г сайтар харж, setup-аа ойлгоорой.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <h4 className="mb-2 text-sm font-semibold">2. Risk тооцоолох</h4>
                    <p className="text-xs text-muted-foreground">
                      RR {signal.rr?.toFixed(2) || "N/A"} байна. Таны risk дүрэмд нийцэж байна уу?
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <h4 className="mb-2 text-sm font-semibold">3. Plan бичих</h4>
                    <p className="text-xs text-muted-foreground">
                      Энэ setup-ийг хэрхэн trade хийхээ тэмдэглэлдээ бичээрэй.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
