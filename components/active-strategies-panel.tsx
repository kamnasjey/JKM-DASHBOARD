"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, TrendingUp, TrendingDown, Clock, Radio, Activity } from "lucide-react"

interface Strategy {
  strategy_id: string
  name: string
  enabled: boolean
  symbols?: string[]
  detectors?: string[]
  timeframe?: string
}

interface FeedItem {
  symbol: string
  lastCandleTs?: string
  lagSec?: number
  rootCause?: string
}

interface ActiveStrategiesPanelProps {
  strategies: Strategy[]
  feedStatus?: {
    items?: FeedItem[]
    serverTime?: string
  } | null
  lastSignals?: Record<string, { direction: string; entry: number; time: string }>
  onSymbolClick?: (symbol: string) => void
}

export function ActiveStrategiesPanel({
  strategies,
  feedStatus,
  lastSignals = {},
  onSymbolClick,
}: ActiveStrategiesPanelProps) {
  const enabledStrategies = useMemo(
    () => strategies.filter((s) => s.enabled),
    [strategies]
  )

  const getSymbolStatus = (symbol: string) => {
    const item = feedStatus?.items?.find(
      (i) => i.symbol?.toUpperCase() === symbol.toUpperCase()
    )
    if (!item) return { status: "unknown", lagSec: null }

    if (item.rootCause === "MARKET_CLOSED") {
      return { status: "closed", lagSec: item.lagSec }
    }
    if (item.lagSec && item.lagSec > 300) {
      return { status: "delayed", lagSec: item.lagSec }
    }
    return { status: "live", lagSec: item.lagSec }
  }

  const formatLag = (lagSec: number | null) => {
    if (lagSec === null) return "—"
    if (lagSec < 60) return `${lagSec}s`
    const mins = Math.floor(lagSec / 60)
    const secs = lagSec % 60
    return `${mins}m ${secs}s`
  }

  if (enabledStrategies.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Идэвхтэй стратеги байхгүй</p>
          <p className="text-sm mt-2">Scanner Config хуудаснаас стратеги идэвхжүүлнэ үү</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {enabledStrategies.map((strategy) => {
        const symbols = strategy.symbols || []
        const timeframe = strategy.timeframe || "M5"

        return (
          <Card
            key={strategy.strategy_id}
            className="border-primary/20 bg-gradient-to-br from-card to-primary/5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="truncate">{strategy.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {timeframe}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {symbols.length === 0 ? (
                <p className="text-sm text-muted-foreground">Symbol тохируулаагүй</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {symbols.map((symbol) => {
                    const { status, lagSec } = getSymbolStatus(symbol)
                    const signal = lastSignals[symbol]

                    return (
                      <div
                        key={symbol}
                        className="rounded-lg border p-3 bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => onSymbolClick?.(symbol)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-medium">
                            {symbol}
                          </span>
                          {status === "live" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-green-600 border-green-600"
                            >
                              LIVE
                            </Badge>
                          )}
                          {status === "delayed" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-amber-500 border-amber-500"
                            >
                              DELAY
                            </Badge>
                          )}
                          {status === "closed" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-blue-500 border-blue-500"
                            >
                              CLOSED
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatLag(lagSec ?? null)}</span>

                          {signal && (
                            <span
                              className={`ml-auto flex items-center gap-1 ${
                                signal.direction === "BUY"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {signal.direction === "BUY" ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {signal.direction}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Detectors info */}
              {strategy.detectors && strategy.detectors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {strategy.detectors.slice(0, 5).map((d) => (
                    <Badge key={d} variant="secondary" className="text-[10px]">
                      {d}
                    </Badge>
                  ))}
                  {strategy.detectors.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{strategy.detectors.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
