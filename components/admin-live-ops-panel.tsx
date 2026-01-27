"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, AlertTriangle, X, Activity, Clock, Radio, TrendingUp, TrendingDown, Shield } from "lucide-react"

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
  nowTs: number
}

export function AdminLiveOpsPanel({
  feedStatus,
  engineStatus247,
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
      
      // Determine status
      let status: "live" | "delayed" | "closed" | "unknown" = "unknown"
      let lagSec = effSym?.lagSec ?? feedItem?.lagSec ?? null
      let lastCandleTs = effSym?.lastCandleTs ?? feedItem?.lastCandleTs ?? null
      let lastScanTs = effSym?.lastScanTs ?? null
      let setupsFound24h = effSym?.setupsFound24h ?? 0
      let isMapped = effSym?.isMapped ?? false
      let strategyName = effSym?.strategyNameUsed ?? null
      let rootCause = effSym?.delayReason ?? feedItem?.rootCause ?? null
      
      if (rootCause === "MARKET_CLOSED") {
        status = "closed"
      } else if (lagSec && lagSec > 300) {
        status = "delayed"
      } else if (lagSec !== null || lastCandleTs) {
        status = "live"
      }
      
      return {
        symbol,
        status,
        lagSec,
        lastCandleTs,
        lastScanTs,
        setupsFound24h,
        isMapped,
        strategyName,
        rootCause,
      }
    })
  }, [feedStatus, engineStatus247])

  // Aggregate stats
  const stats = useMemo(() => {
    let live = 0
    let delayed = 0
    let closed = 0
    let unknown = 0
    let totalMapped = 0
    let totalSetups = 0
    
    symbolStatuses.forEach((s) => {
      if (s.status === "live") live++
      else if (s.status === "delayed") delayed++
      else if (s.status === "closed") closed++
      else unknown++
      
      if (s.isMapped) totalMapped++
      totalSetups += s.setupsFound24h
    })
    
    return { live, delayed, closed, unknown, totalMapped, totalSetups }
  }, [symbolStatuses])

  const formatLag = (lagSec: number | null | undefined) => {
    if (lagSec === null || lagSec === undefined) return "—"
    if (lagSec < 60) return `${Math.round(lagSec)}s`
    const mins = Math.floor(lagSec / 60)
    const secs = Math.round(lagSec % 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      return `${hours}h ${remainMins}m`
    }
    return `${mins}m ${secs}s`
  }

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return "—"
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    } catch {
      return "—"
    }
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
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Admin Live Ops — 15 Symbols</CardTitle>
        </div>
        <CardDescription>
          Бүх символийн market data болон scanner төлөв (зөвхөн админ харна)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          <div className="text-center p-2 rounded-md bg-green-500/10 border border-green-500/30">
            <div className="text-xl font-bold text-green-500">{stats.live}</div>
            <div className="text-[10px] text-muted-foreground">LIVE</div>
          </div>
          <div className="text-center p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="text-xl font-bold text-amber-500">{stats.delayed}</div>
            <div className="text-[10px] text-muted-foreground">DELAYED</div>
          </div>
          <div className="text-center p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="text-xl font-bold text-blue-500">{stats.closed}</div>
            <div className="text-[10px] text-muted-foreground">CLOSED</div>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/30 border border-muted-foreground/30">
            <div className="text-xl font-bold text-muted-foreground">{stats.unknown}</div>
            <div className="text-[10px] text-muted-foreground">UNKNOWN</div>
          </div>
          <div className="text-center p-2 rounded-md bg-primary/10 border border-primary/30">
            <div className="text-xl font-bold text-primary">{stats.totalMapped}</div>
            <div className="text-[10px] text-muted-foreground">MAPPED</div>
          </div>
          <div className="text-center p-2 rounded-md bg-primary/10 border border-primary/30">
            <div className="text-xl font-bold text-primary">{stats.totalSetups}</div>
            <div className="text-[10px] text-muted-foreground">24h SETUPS</div>
          </div>
        </div>

        {/* Engine Status */}
        {engineStatus247 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4 p-2 rounded bg-muted/20">
            <span className="flex items-center gap-1">
              <Radio className={`h-3 w-3 ${engineStatus247.engineRunning ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
              Engine: {engineStatus247.engineRunning ? "Running" : "Stopped"}
            </span>
            {engineStatus247.lastOutcome && (
              <>
                <span>|</span>
                <span>Cycle #{engineStatus247.lastOutcome.cycle}</span>
                <span>|</span>
                <span>Scanned: {engineStatus247.lastOutcome.symbolsScanned}</span>
                <span>|</span>
                <span>Setups: {engineStatus247.lastOutcome.setupsFound}</span>
              </>
            )}
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
                ${item.status === "unknown" ? "border-muted-foreground/30 bg-muted/10" : ""}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-bold">{item.symbol}</span>
                <div className="flex items-center gap-1">
                  {item.status === "live" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-green-500 border-green-500 gap-0.5">
                      <Check className="h-2.5 w-2.5" />
                      LIVE
                    </Badge>
                  )}
                  {item.status === "delayed" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500 gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      DELAY
                    </Badge>
                  )}
                  {item.status === "closed" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-blue-500 border-blue-500 gap-0.5">
                      <X className="h-2.5 w-2.5" />
                      CLOSED
                    </Badge>
                  )}
                  {item.status === "unknown" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground border-muted-foreground/50 gap-0.5">
                      ?
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {/* Data Lag */}
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>Lag: {formatLag(item.lagSec)}</span>
                  {item.lastCandleTs && (
                    <span className="text-muted-foreground/70">
                      (Last: {formatTime(item.lastCandleTs)})
                    </span>
                  )}
                </div>

                {/* Strategy Mapping */}
                {item.isMapped && item.strategyName && (
                  <div className="flex items-center gap-1 text-primary">
                    <Activity className="h-2.5 w-2.5" />
                    <span className="truncate">{item.strategyName}</span>
                  </div>
                )}

                {/* Setups Found */}
                {item.setupsFound24h > 0 && (
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-2.5 w-2.5" />
                    <span>{item.setupsFound24h} setups (24h)</span>
                  </div>
                )}

                {/* Last Scan */}
                {item.lastScanTs && (
                  <div className="flex items-center gap-1">
                    <Radio className="h-2.5 w-2.5" />
                    <span>Scan: {formatRelative(item.lastScanTs)}</span>
                  </div>
                )}
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
