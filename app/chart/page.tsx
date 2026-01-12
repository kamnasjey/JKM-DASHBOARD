"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TradingChart } from "@/components/trading-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, TrendingUp, TrendingDown, Clock, Target } from "lucide-react"
import { useSymbols } from "@/hooks/use-symbols"
import { useSignals } from "@/hooks/use-signals"
import { useAuthGuard } from "@/lib/auth-guard"
import { format } from "date-fns"

export default function ChartPage() {
  useAuthGuard(true)

  const { symbols } = useSymbols()
  const { signals } = useSignals({ limit: 20 })
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD")

  // Set default symbol when loaded
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0])
    }
  }, [symbols, selectedSymbol])

  // Filter signals for selected symbol
  const symbolSignals = signals.filter(
    (s) => s.symbol?.toUpperCase() === selectedSymbol.toUpperCase()
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chart</h1>
            <p className="text-muted-foreground">TradingView маягийн график</p>
          </div>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Main Chart */}
        <TradingChart symbol={selectedSymbol} signals={signals} />

        {/* Signals panel */}
        {symbolSignals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {selectedSymbol} дохионууд
                <Badge variant="secondary">{symbolSignals.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {symbolSignals.slice(0, 5).map((signal, idx) => (
                  <div
                    key={signal.signal_id || idx}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          signal.direction === "BUY"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {signal.direction === "BUY" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{signal.direction}</span>
                          <Badge variant="outline" className="text-xs">
                            {signal.status || "PENDING"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {signal.created_at
                            ? format(new Date(signal.created_at * 1000), "MMM dd, HH:mm")
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Entry:</span>
                          <span className="ml-1 font-mono">{signal.entry?.toFixed(5)}</span>
                        </div>
                        {signal.sl && (
                          <div>
                            <span className="text-xs text-orange-500">SL:</span>
                            <span className="ml-1 font-mono">{signal.sl.toFixed(5)}</span>
                          </div>
                        )}
                        {signal.tp && (
                          <div>
                            <span className="text-xs text-blue-500">TP:</span>
                            <span className="ml-1 font-mono">{signal.tp.toFixed(5)}</span>
                          </div>
                        )}
                        {signal.rr && (
                          <Badge
                            variant={signal.rr >= 2 ? "default" : "secondary"}
                            className="ml-2"
                          >
                            RR: {signal.rr.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick symbol switch */}
        <Card>
          <CardHeader>
            <CardTitle>Түргэн сонголт</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {symbols.slice(0, 15).map((symbol) => (
                <Button
                  key={symbol}
                  variant={selectedSymbol === symbol ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSymbol(symbol)}
                >
                  {symbol}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
