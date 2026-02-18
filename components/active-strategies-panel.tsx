"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, TrendingUp, TrendingDown, Clock, Radio, Check, AlertTriangle, X } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

// Client-side market closed detection (weekend check)
const isMarketClosedNow = (symbol: string): boolean => {
  const s = symbol.toUpperCase()
  if (s.startsWith("BTC") || s.startsWith("ETH") || s.startsWith("SOL")) return false
  const day = new Date().getUTCDay()
  return day === 0 || day === 6
}

interface Strategy {
  id?: string
  strategy_id?: string
  name: string
  detectors?: string[]
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

interface FeedItem {
  symbol: string
  lastCandleTs?: string
  lagSec?: number
  rootCause?: string
}

interface ActiveStrategiesPanelProps {
  activeStrategyMap: Record<string, string>
  symbolEnabled: Record<string, boolean>
  strategies: Strategy[]
  engineStatus247?: {
    effectiveSymbols?: EffectiveSymbol[]
    engineRunning?: boolean
    lastCycleTs?: string
  } | null
  feedStatus?: {
    items?: FeedItem[]
    serverTime?: string
  } | null
  lastSignals?: Record<string, { direction: string; entry: number; time: string }>
  onSymbolClick?: (symbol: string) => void
}

export function ActiveStrategiesPanel({
  activeStrategyMap,
  symbolEnabled,
  strategies,
  engineStatus247,
  feedStatus,
  lastSignals = {},
  onSymbolClick,
}: ActiveStrategiesPanelProps) {
  const { t } = useLanguage()

  const activeSymbols = useMemo(() => {
    const pairs: Array<{
      symbol: string
      strategyId: string
      strategyName: string
      detectors: string[]
    }> = []

    for (const [symbol, strategyId] of Object.entries(activeStrategyMap)) {
      if (!strategyId) continue
      if (symbolEnabled[symbol] === false) continue

      const strategy = strategies.find(
        (s) => (s.id || s.strategy_id) === strategyId
      )
      pairs.push({
        symbol,
        strategyId,
        strategyName: strategy?.name || strategyId,
        detectors: strategy?.detectors || [],
      })
    }

    return pairs.sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [activeStrategyMap, symbolEnabled, strategies])

  const getSymbolStatus = (symbol: string) => {
    const effSym = engineStatus247?.effectiveSymbols?.find(
      (e) => e.symbol?.toUpperCase() === symbol.toUpperCase()
    )
    if (effSym) {
      if (effSym.delayReason === "MARKET_CLOSED") {
        return { status: "closed", lagSec: effSym.lagSec, lastScan: effSym.lastScanTs }
      }
      if (effSym.lagSec && effSym.lagSec > 300) {
        if (isMarketClosedNow(symbol)) {
          return { status: "closed", lagSec: effSym.lagSec, lastScan: effSym.lastScanTs }
        }
        return { status: "delayed", lagSec: effSym.lagSec, lastScan: effSym.lastScanTs }
      }
      return { status: "live", lagSec: effSym.lagSec, lastScan: effSym.lastScanTs }
    }

    const item = feedStatus?.items?.find(
      (i) => i.symbol?.toUpperCase() === symbol.toUpperCase()
    )
    if (item) {
      if (item.rootCause === "MARKET_CLOSED") {
        return { status: "closed", lagSec: item.lagSec, lastScan: null }
      }
      if (item.lagSec && item.lagSec > 300) {
        if (isMarketClosedNow(symbol)) {
          return { status: "closed", lagSec: item.lagSec, lastScan: null }
        }
        return { status: "delayed", lagSec: item.lagSec, lastScan: null }
      }
      return { status: "live", lagSec: item.lagSec, lastScan: null }
    }

    if (isMarketClosedNow(symbol)) {
      return { status: "closed", lagSec: null, lastScan: null }
    }
    return { status: "unknown", lagSec: null, lastScan: null }
  }

  const formatLag = (lagSec: number | null | undefined) => {
    if (lagSec === null || lagSec === undefined) return "—"
    if (lagSec < 60) return `${Math.round(lagSec)}s`
    const mins = Math.floor(lagSec / 60)
    const secs = Math.round(lagSec % 60)
    return `${mins}m ${secs}s`
  }

  const formatRelativeTime = (ts: string | null | undefined) => {
    if (!ts) return "—"
    try {
      const diff = Date.now() - new Date(ts).getTime()
      const sec = Math.floor(diff / 1000)
      if (sec < 60) return `${sec}s ${t("ago", "өмнө")}`
      const min = Math.floor(sec / 60)
      if (min < 60) return `${min}m ${t("ago", "өмнө")}`
      const hr = Math.floor(min / 60)
      return `${hr}h ${t("ago", "өмнө")}`
    } catch {
      return "—"
    }
  }

  if (activeSymbols.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t("No active pairs", "Идэвхтэй хослол байхгүй")}</p>
          <p className="text-sm mt-2">{t("Set up strategy for pairs in Scanner Config", "Scanner Config хуудаснаас хослол дээр strategy тохируулна уу")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {activeSymbols.map(({ symbol, strategyId, strategyName, detectors }) => {
        const { status, lagSec, lastScan } = getSymbolStatus(symbol)
        const signal = lastSignals[symbol]
        const isEngineRunning = engineStatus247?.engineRunning

        return (
          <div
            key={symbol}
            className="rounded-lg border p-4 bg-card/50 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onSymbolClick?.(symbol)}
          >
            {/* Header: Symbol + Status */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-lg font-bold">{symbol}</span>
              <div className="flex items-center gap-1">
                {status === "live" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-green-500 border-green-500 gap-1">
                    <Check className="h-3 w-3" />
                    LIVE
                  </Badge>
                )}
                {status === "delayed" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-amber-500 border-amber-500 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("DELAY", "СААТАЛ")}
                  </Badge>
                )}
                {status === "closed" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-blue-500 border-blue-500 gap-1">
                    <X className="h-3 w-3" />
                    {t("CLOSED", "ХААЛТТАЙ")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Strategy Name */}
            <div className="text-sm text-primary font-medium truncate mb-2" title={strategyName}>
              {strategyName}
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" title={t("Data Feed Lag", "Дата саатал")}>
                <Zap className="h-3 w-3" />
                <span>{formatLag(lagSec)}</span>
              </div>

              {lastScan && (
                <div className="flex items-center gap-1" title={t("Last Scanned", "Сүүлд скан хийсэн")}>
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(lastScan)}</span>
                </div>
              )}

              {isEngineRunning && (
                <div className="flex items-center gap-1 text-green-500" title={t("Scanner Running", "Scanner ажиллаж байна")}>
                  <Radio className="h-3 w-3 animate-pulse" />
                </div>
              )}
            </div>

            {/* Signal if exists */}
            {signal && (
              <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${
                signal.direction === "BUY" ? "text-green-500" : "text-red-500"
              }`}>
                {signal.direction === "BUY" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{signal.direction} @ {typeof signal.entry === "number" ? signal.entry.toFixed(signal.entry > 100 ? 2 : 5) : signal.entry}</span>
              </div>
            )}

            {/* Detectors (compact) */}
            {detectors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {detectors.slice(0, 3).map((d) => (
                  <Badge key={d} variant="secondary" className="text-[9px] px-1 py-0">
                    {d}
                  </Badge>
                ))}
                {detectors.length > 3 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    +{detectors.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
