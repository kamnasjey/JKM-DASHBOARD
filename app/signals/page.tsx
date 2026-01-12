"use client"

import { useState, useMemo, useEffect } from "react"
import { Filter, Wifi, WifiOff, Bell } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SignalsTable } from "@/components/signals-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSignals } from "@/hooks/use-signals"
import { useSymbols } from "@/hooks/use-symbols"
import { useWebSocketSignals } from "@/hooks/use-websocket-signals"
import { useAuthGuard } from "@/lib/auth-guard"
import { useToast } from "@/hooks/use-toast"

export default function SignalsPage() {
  useAuthGuard(true)
  const { toast } = useToast()

  const { symbols } = useSymbols()
  const { signals: httpSignals, loading } = useSignals({ limit: 50 })
  const { 
    signals: wsSignals, 
    newSignals, 
    connected, 
    lastUpdate,
    clearNewSignals 
  } = useWebSocketSignals()
  
  // Use WS signals if connected and available, otherwise fall back to HTTP
  const signals = connected && wsSignals.length > 0 ? wsSignals : httpSignals
  
  // Show toast when new signals arrive
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
  
  const [filters, setFilters] = useState({
    symbol: "all",
    direction: "all",
    status: "all",
    rrMin: "",
    rrMax: "",
  })

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      if (filters.symbol !== "all" && signal.symbol !== filters.symbol) return false
      if (filters.direction !== "all" && signal.direction !== filters.direction) return false
      if (filters.status !== "all" && signal.status !== filters.status) return false
      if (filters.rrMin && signal.rr && signal.rr < Number.parseFloat(filters.rrMin)) return false
      if (filters.rrMax && signal.rr && signal.rr > Number.parseFloat(filters.rrMax)) return false
      return true
    })
  }, [signals, filters])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Signals</h1>
            <p className="text-muted-foreground">Таны trading дохионуудын жагсаалт</p>
          </div>
          <div className="flex items-center gap-3">
            {/* WebSocket Connection Status */}
            <Badge 
              variant={connected ? "default" : "secondary"} 
              className={`flex items-center gap-1.5 ${connected ? "bg-green-600" : ""}`}
            >
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </Badge>
            {lastUpdate && connected && (
              <span className="text-xs text-muted-foreground hidden md:block">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={() => window.location.reload()} size="sm">
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Шинэчлэх</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Шүүлтүүр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Select value={filters.symbol} onValueChange={(value) => setFilters({ ...filters, symbol: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Чиглэл</label>
                <Select
                  value={filters.direction}
                  onValueChange={(value) => setFilters({ ...filters, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Статус</label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="NONE">NONE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">RR Min</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={filters.rrMin}
                  onChange={(e) => setFilters({ ...filters, rrMin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">RR Max</label>
                <Input
                  type="number"
                  placeholder="10.0"
                  value={filters.rrMax}
                  onChange={(e) => setFilters({ ...filters, rrMax: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ачааллаж байна...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {filteredSignals.length} дохио олдлоо ({signals.length} нийт)
            </p>
            <SignalsTable signals={filteredSignals} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
