"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// API URL from environment
const API_URL = process.env.NEXT_PUBLIC_JKM_BOT_API || "http://159.65.11.255:8000"

interface RegimeCell {
  regime: string
  emoji: string
  label: string
  strength?: number
}

interface RegimeStatusResponse {
  ok: boolean
  timestamp: number
  symbols: string[]
  timeframes: string[]
  regimes: Record<string, Record<string, RegimeCell>>
}

// Regime color mapping
const REGIME_COLORS: Record<string, string> = {
  trend_up: "bg-green-500/20 text-green-400 border-green-500/30",
  trend_down: "bg-red-500/20 text-red-400 border-red-500/30",
  range: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  consolidation: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  breakout: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pullback: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reversal: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  unknown: "bg-gray-700/20 text-gray-500 border-gray-700/30",
  error: "bg-red-700/20 text-red-500 border-red-700/30",
}

// Format timestamp
function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString("en-US", { hour12: false })
}

// Individual regime cell component
function RegimeCell({ data, symbol, tf }: { data: RegimeCell; symbol: string; tf: string }) {
  const colorClass = REGIME_COLORS[data.regime] || REGIME_COLORS.unknown

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "px-1.5 py-1 rounded text-center cursor-default transition-colors",
              "border text-xs font-medium",
              colorClass
            )}
          >
            <span className="mr-0.5">{data.emoji}</span>
            <span className="hidden sm:inline">{data.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="text-xs">
            <div className="font-semibold">{symbol} - {tf}</div>
            <div className="mt-1">
              {data.emoji} {data.label}
            </div>
            {data.strength != null && (
              <div className="text-muted-foreground mt-0.5">
                Strength: {data.strength.toFixed(1)}%
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface RegimeStatusGridProps {
  /** Symbols to show (optional - defaults to all) */
  symbols?: string[]
  /** Auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number
  /** Compact mode */
  compact?: boolean
}

export function RegimeStatusGrid({
  symbols: filterSymbols,
  refreshInterval = 30000,
  compact = false,
}: RegimeStatusGridProps) {
  const [data, setData] = useState<RegimeStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/regime-status`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      if (result.ok) {
        setData(result)
        setLastUpdate(Date.now())
        setError(null)
      } else {
        throw new Error("API returned ok=false")
      }
    } catch (err: any) {
      console.error("[regime-status] fetch error:", err)
      setError(err.message || "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, fetchData])

  // Get symbols to display
  const displaySymbols = filterSymbols && filterSymbols.length > 0
    ? filterSymbols
    : data?.symbols || []

  const timeframes = data?.timeframes || ["M5", "M15", "M30", "H1", "H4"]

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Market Regime Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Market Regime Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-400 text-sm">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Market Regime Status
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastUpdate > 0 && (
              <span>Updated: {formatTime(lastUpdate)}</span>
            )}
            <button
              onClick={fetchData}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time market regime detection across all timeframes
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {/* Regime Legend */}
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-border">
          <Badge variant="outline" className={REGIME_COLORS.trend_up}>
            📈 Trend Up
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.trend_down}>
            📉 Trend Down
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.range}>
            ↔️ Range
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.consolidation}>
            🧱 Consolidation
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.breakout}>
            🚀 Breakout
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.pullback}>
            🔁 Pullback
          </Badge>
          <Badge variant="outline" className={REGIME_COLORS.reversal}>
            🔄 Reversal
          </Badge>
        </div>

        {/* Grid Table */}
        <div className="min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">
                  Symbol
                </th>
                {timeframes.map((tf) => (
                  <th
                    key={tf}
                    className="text-center py-2 px-1 font-medium text-muted-foreground"
                  >
                    {tf}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displaySymbols.map((symbol) => {
                const symbolData = data?.regimes?.[symbol] || {}
                return (
                  <tr key={symbol} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-2 font-medium">{symbol}</td>
                    {timeframes.map((tf) => {
                      const cell = symbolData[tf] || {
                        regime: "unknown",
                        emoji: "❓",
                        label: "No Data",
                      }
                      return (
                        <td key={tf} className="py-1 px-1">
                          <RegimeCell data={cell} symbol={symbol} tf={tf} />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Auto-refreshes every {refreshInterval / 1000}s
        </div>
      </CardContent>
    </Card>
  )
}

export default RegimeStatusGrid
