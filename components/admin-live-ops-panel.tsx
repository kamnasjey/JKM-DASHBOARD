"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, AlertTriangle, X, Clock, Radio, Shield } from "lucide-react"

// All 15 supported symbols (Forex + Metals + Crypto)
export const ALL_SYMBOLS = [
  // Major Forex
  "EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD",
  // Cross pairs
  "EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "EURAUD", "EURCHF",
  // Metals + Crypto
  "XAUUSD", "BTCUSD"
]

interface FeedItem {
  symbol: string
  lastCandleTs?: string
  lagSec?: number
  rootCause?: string
}

interface EffectiveSymbol {
  symbol: string
  strategyIdUsed: string
  strategyNameUsed?: string
  isMapped: boolean
  lastScanTs?: string
  lastSetupFoundTs?: string
  setupsFound24h?: number
  delayReason?: string
  lagSec?: number
  lastCandleTs?: string
}

interface AdminLiveOpsPanelProps {
  feedStatus?: {
    items?: FeedItem[]
    serverTime?: string
    worst?: {
      symbol?: string
      rootCause?: string
      lagSec?: number
    }
  } | null
  engineStatus247?: {
    effectiveSymbols?: EffectiveSymbol[]
    engineRunning?: boolean
    lastCycleTs?: string
    lastOutcome?: {
      cycle?: number
      ts?: string
      symbolsScanned?: number
      setupsFound?: number
      rootCause?: string
    }
  } | null
  // Direct candle timestamps per symbol (unix seconds)
  allSymbolsCandles?: Record<string, number | null>
  nowTs: number
}

export function AdminLiveOpsPanel({
  feedStatus,
  engineStatus247,
  allSymbolsCandles = {},
  nowTs,
}: AdminLiveOpsPanelProps) {
  // Get status for each symbol
  const symbolStatuses = useMemo(() => {
    return ALL_SYMBOLS.map((symbol) => {
      // Check engineStatus247 first
      const effSym = engineStatus247?.effectiveSymbols?.find(
        (e) => e.symbol?.toUpperCase() === symbol.toUpperCase()
      )
      
      // Then check feedStatus
      const feedItem = feedStatus?.items?.find(
        (i) => i.symbol?.toUpperCase() === symbol.toUpperCase()
      )
      
      // Get lastCandleTs from allSymbolsCandles (direct fetch), feedStatus, or engineStatus247
      let lastCandleTs = effSym?.lastCandleTs ?? feedItem?.lastCandleTs ?? null
      let rootCause = effSym?.delayReason ?? feedItem?.rootCause ?? null
      
      // Calculate lag from lastCandleTs if available
      let lagSec: number | null = null
      let lastCandleUnix: number | null = null
      
      // Priority: allSymbolsCandles (direct fetch) > feedStatus > engineStatus247
      const directCandleTs = allSymbolsCandles[symbol]
      if (directCandleTs !== undefined && directCandleTs !== null) {
        lastCandleUnix = directCandleTs
        lagSec = Math.max(0, nowTs - lastCandleUnix)
      } else if (lastCandleTs) {
        try {
          lastCandleUnix = Math.floor(new Date(lastCandleTs).getTime() / 1000)
          lagSec = Math.max(0, nowTs - lastCandleUnix)
        } catch {
          lagSec = effSym?.lagSec ?? feedItem?.lagSec ?? null
        }
      } else {
        lagSec = effSym?.lagSec ?? feedItem?.lagSec ?? null
      }
      
      // Calculate next M5 candle time (M5 = 300 seconds)
      let nextCandleIn: number | null = null
      if (lastCandleUnix) {
        const nextCandleTs = lastCandleUnix + 300
        nextCandleIn = nextCandleTs - nowTs
      }
      
      // Determine status
      let status: "live" | "delayed" | "closed" = "delayed"
      
      if (rootCause === "MARKET_CLOSED") {
        status = "closed"
      } else if (lagSec !== null) {
        // Live = candle arrived within 5min + 60sec grace (360 sec)
        // Delayed = more than that
        if (lagSec <= 360) {
          status = "live"
        } else {
          status = "delayed"
        }
      }
      
      return {
        symbol,
        status,
        lagSec,
        lastCandleTs,
        lastCandleUnix,
        nextCandleIn,
        rootCause,
      }
    })
  }, [feedStatus, engineStatus247, allSymbolsCandles, nowTs])

  // Aggregate stats - only LIVE, DELAYED, CLOSED
  const stats = useMemo(() => {
    let live = 0
    let delayed = 0
    let closed = 0
    
    symbolStatuses.forEach((s) => {
      if (s.status === "live") live++
      else if (s.status === "delayed") delayed++
      else if (s.status === "closed") closed++
    })
    
    return { live, delayed, closed }
  }, [symbolStatuses])

  // Format lag as "Xm Ys ago"
  const formatLagAgo = (lagSec: number | null | undefined) => {
    if (lagSec === null || lagSec === undefined) return "—"
    const mins = Math.floor(lagSec / 60)
    const secs = Math.floor(lagSec % 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      return `${hours}h ${remainMins}m ago`
    }
    if (mins > 0) {
      return `${mins}m ${secs}s ago`
    }
    return `${secs}s ago`
  }

  // Format next candle countdown as "M:SS"
  const formatNextCandle = (nextIn: number | null | undefined) => {
    if (nextIn === null || nextIn === undefined) return "—"
    
    if (nextIn <= 0) {
      // Overdue - candle should have arrived
      const overdue = Math.abs(nextIn)
      const mins = Math.floor(overdue / 60)
      const secs = Math.floor(overdue % 60)
      return `overdue ${mins}m ${secs}s`
    }
    
    const mins = Math.floor(nextIn / 60)
    const secs = Math.floor(nextIn % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatRelative = (ts: string | null | undefined) => {
    if (!ts) return "—"
    try {
      const diff = nowTs * 1000 - new Date(ts).getTime()
      const sec = Math.floor(diff / 1000)
      if (sec < 0) return "just now"
      if (sec < 60) return `${sec}s ago`
      const min = Math.floor(sec / 60)
      if (min < 60) return `${min}m ago`
      const hr = Math.floor(min / 60)
      return `${hr}h ago`
    } catch {
      return "—"
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Market Status — 15 Symbols</CardTitle>
        </div>
        <CardDescription>
          Бүх символийн market data болон scanner төлөв
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Explanation for users */}
        <div className="text-xs bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4 space-y-1.5">
          <p className="font-medium text-blue-600">💡 Энэ юу харуулдаг вэ?</p>
          <p className="text-muted-foreground">
            Энд бидний дэмждэг 15 символийн <span className="text-foreground font-medium">шууд мэдээлэл</span>-ийн төлөв харагдана.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground mt-1">
            <span><span className="text-green-500 font-medium">LIVE</span> — Data шинэ, хэвийн ажиллаж байна</span>
            <span><span className="text-amber-500 font-medium">DELAYED</span> — Data удааширсан (5+ мин)</span>
            <span><span className="text-blue-500 font-medium">CLOSED</span> — Market хаалттай</span>
          </div>
        </div>

        {/* Stats Summary - Only LIVE, DELAYED, CLOSED */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-md bg-green-500/10 border border-green-500/30">
            <div className="text-2xl font-bold text-green-500">{stats.live}</div>
            <div className="text-[10px] text-muted-foreground">LIVE</div>
          </div>
          <div className="text-center p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="text-2xl font-bold text-amber-500">{stats.delayed}</div>
            <div className="text-[10px] text-muted-foreground">DELAYED</div>
          </div>
          <div className="text-center p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-500">{stats.closed}</div>
            <div className="text-[10px] text-muted-foreground">CLOSED</div>
          </div>
        </div>

        {/* Engine Status */}
        {engineStatus247 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4 p-2 rounded bg-muted/20">
            <span className="flex items-center gap-1">
              <Radio className={`h-3 w-3 ${engineStatus247.engineRunning ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
              Engine: {engineStatus247.engineRunning ? "Running" : "Stopped"}
            </span>
            {engineStatus247.lastCycleTs && (
              <>
                <span>|</span>
                <span>Last: {formatRelative(engineStatus247.lastCycleTs)}</span>
              </>
            )}
          </div>
        )}

        {/* All Symbols Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {symbolStatuses.map((item) => (
            <div
              key={item.symbol}
              className={`
                rounded-md border p-3 transition-colors
                ${item.status === "live" ? "border-green-500/30 bg-green-500/5" : ""}
                ${item.status === "delayed" ? "border-amber-500/30 bg-amber-500/5" : ""}
                ${item.status === "closed" ? "border-blue-500/30 bg-blue-500/5" : ""}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold">{item.symbol}</span>
                <div className="flex items-center gap-1">
                  {item.status === "live" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-green-500 border-green-500 gap-0.5">
                      <Check className="h-2.5 w-2.5" />
                      LIVE
                    </Badge>
                  )}
                  {item.status === "delayed" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-amber-500 border-amber-500 gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      DELAY
                    </Badge>
                  )}
                  {item.status === "closed" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-blue-500 border-blue-500 gap-0.5">
                      <X className="h-2.5 w-2.5" />
                      CLOSED
                    </Badge>
                  )}
                </div>
              </div>

              {/* Last M5 and Next In */}
              <div className="text-[11px] space-y-1">
                {/* Last M5 */}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Last M5:</span>
                  <span className={`font-mono ${item.status === "live" ? "text-green-500" : item.status === "delayed" ? "text-amber-500" : "text-blue-500"}`}>
                    {formatLagAgo(item.lagSec)}
                  </span>
                </div>

                {/* Next In */}
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Next in:</span>
                  <span className={`font-mono ${
                    item.nextCandleIn !== null && item.nextCandleIn <= 0 
                      ? "text-amber-500" 
                      : "text-foreground"
                  }`}>
                    {item.status === "closed" ? "—" : formatNextCandle(item.nextCandleIn)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feed Status Server Time */}
        {feedStatus?.serverTime && (
          <div className="mt-4 text-[10px] text-muted-foreground text-center">
            Server Time: {new Date(feedStatus.serverTime).toLocaleString("mn-MN")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
