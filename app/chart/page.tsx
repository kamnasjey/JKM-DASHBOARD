"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProChartContainer } from "@/components/pro-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useSymbols } from "@/hooks/use-symbols"
import { useSignals } from "@/hooks/use-signals"
import { useAuthGuard } from "@/lib/auth-guard"
import { formatTimestamp } from "@/lib/utils-trading"
import Link from "next/link"

export default function ChartPage() {
  useAuthGuard(true)

  const { symbols, loading: symbolsLoading } = useSymbols()
  const { signals } = useSignals({ limit: 50 })

  // Get symbol list with fallback
  const symbolList = symbols.length > 0
    ? symbols
    : ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD"]

  // Filter recent signals (for display below chart)
  const recentSignals = signals
    .filter(s => s.entry)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 10)

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Pro Chart with Drawing Tools */}
        <ProChartContainer
          symbols={symbolList}
          initialSymbol="XAUUSD"
          initialTimeframe="M5"
          height={550}
        />

        {/* Recent Signals Panel */}
        {recentSignals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Сүүлийн дохионууд
                <Badge variant="secondary" className="ml-2">
                  {recentSignals.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recentSignals.map(signal => (
                  <Link
                    key={signal.signal_id}
                    href={`/signals/${signal.signal_id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          signal.direction === "BUY" || signal.direction === "bullish"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {signal.direction === "BUY" || signal.direction === "bullish" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{signal.symbol}</span>
                          <span className="text-xs text-muted-foreground">
                            {signal.direction === "BUY" || signal.direction === "bullish" ? "BUY" : "SELL"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(signal.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs">
                        <div>@ {signal.entry?.toFixed(signal.symbol?.includes("JPY") ? 3 : 5)}</div>
                      </div>
                      {signal.rr && (
                        <Badge
                          variant={signal.rr >= 2.7 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {signal.rr.toFixed(1)}R
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
