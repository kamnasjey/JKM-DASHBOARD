"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TradingViewWidget } from "@/components/tradingview-widget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useSymbols } from "@/hooks/use-symbols"
import { useSignals } from "@/hooks/use-signals"
import { useAuthGuard } from "@/lib/auth-guard"
import { formatTimestamp } from "@/lib/utils-trading"
import Link from "next/link"

export default function ChartPage() {
  useAuthGuard(true)

  const { symbols } = useSymbols()
  const { signals } = useSignals({ limit: 50 })
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD")
  const [timeframe, setTimeframe] = useState("60")

  // Set default symbol when loaded
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0])
    }
  }, [symbols, selectedSymbol])

  // Filter and sort signals for selected symbol
  const symbolSignals = signals
    .filter((s) => s.symbol?.toUpperCase() === selectedSymbol.toUpperCase())
    .sort((a, b) => b.created_at - a.created_at)

  const timeframes = [
    { value: "5", label: "5m" },
    { value: "15", label: "15m" },
    { value: "30", label: "30m" },
    { value: "60", label: "1H" },
    { value: "240", label: "4H" },
    { value: "D", label: "1D" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header with controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeframe(tf.value)}
                  className="h-8 px-3"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {symbols.slice(0, 6).map((symbol) => (
              <Button
                key={symbol}
                variant={selectedSymbol === symbol ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedSymbol(symbol)}
                className="h-8"
              >
                {symbol}
              </Button>
            ))}
          </div>
        </div>

        {/* TradingView Chart */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <TradingViewWidget
              symbol={selectedSymbol}
              interval={timeframe}
              height={600}
              theme="dark"
              showToolbar={true}
            />
          </CardContent>
        </Card>

        {/* Recent Signals for this symbol */}
        {symbolSignals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                {selectedSymbol} сүүлийн дохионууд
                <Badge variant="secondary" className="ml-2">{symbolSignals.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {symbolSignals.slice(0, 5).map((signal) => (
                  <Link
                    key={signal.signal_id}
                    href={`/signals/${signal.signal_id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          signal.direction === "BUY"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {signal.direction === "BUY" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{signal.direction}</span>
                          <span className="text-sm text-muted-foreground">@ {signal.entry?.toFixed(signal.symbol?.includes("JPY") ? 3 : 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(signal.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <div className="text-orange-500">SL: {signal.sl?.toFixed(signal.symbol?.includes("JPY") ? 3 : 5)}</div>
                        <div className="text-blue-500">TP: {signal.tp?.toFixed(signal.symbol?.includes("JPY") ? 3 : 5)}</div>
                      </div>
                      {signal.rr && (
                        <Badge variant={signal.rr >= 2 ? "default" : "secondary"}>
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
