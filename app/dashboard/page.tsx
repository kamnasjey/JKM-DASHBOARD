"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Activity, BarChart3, Layers3, RefreshCw, Wifi, WifiOff, Bell, TrendingUp, TrendingDown, Minus, Check, ChevronDown, Radio, Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard } from "@/components/metric-card"
import { SignalsTable } from "@/components/signals-table"
import { useToast } from "@/hooks/use-toast"
import { useWebSocketSignals } from "@/hooks/use-websocket-signals"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"
import { DETECTOR_CATALOG } from "@/lib/detectors/catalog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SymbolInfo {
  symbol: string
  lastSignal?: SignalPayloadPublicV1
}

interface Strategy {
  strategy_id: string
  name: string
  enabled: boolean
  detectors: string[]
}

type DetectorGroupKey = "gate" | "trigger" | "confluence" | "other"

const STRATEGY_NAME_PREFIX = /^EDGE Starter #\d+\s+—\s+/i

const formatStrategyName = (name: string | null | undefined, id: string) => {
  const raw = String(name || "").trim()
  if (!raw) return id
  return raw.replace(STRATEGY_NAME_PREFIX, "").trim() || raw
}

// Helper: Classify symbols for market hours detection
const isCryptoSymbol = (symbol: string): boolean => {
  const s = symbol.toUpperCase()
  return /^(BTC|ETH|SOL|XRP|ADA|DOGE|DOT|LINK|AVAX|MATIC|SHIB|LTC|UNI|ATOM)/.test(s) ||
         s.includes("USDT") || s.includes("USDC") || s.endsWith("USD") && s.startsWith("BTC")
}

const isForexOrCFD = (symbol: string): boolean => {
  const s = symbol.toUpperCase()
  // Forex pairs (major/minor/cross)
  const forexCurrencies = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"]
  const hasForexPair = forexCurrencies.some(c1 => 
    forexCurrencies.some(c2 => c1 !== c2 && s.includes(c1) && s.includes(c2))
  )
  // Metals
  const isMetals = s.startsWith("XAU") || s.startsWith("XAG")
  // Indices
  const isIndex = /^(US30|NAS100|SPX500|DAX|FTSE|NDX|DJI)/.test(s)
  
  return hasForexPair || isMetals || isIndex
}

// Check if market is closed using server time
const isMarketClosed = (symbol: string, serverTime: string | null): boolean => {
  if (!serverTime) return false
  if (isCryptoSymbol(symbol)) return false // Crypto trades 24/7
  if (!isForexOrCFD(symbol)) return false
  
  try {
    const dt = new Date(serverTime)
    const dayOfWeek = dt.getUTCDay() // 0=Sun, 6=Sat
    return dayOfWeek === 0 || dayOfWeek === 6
  } catch {
    return false
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // WebSocket real-time signals
  const { 
    signals: wsSignals, 
    newSignals, 
    connected: wsConnected, 
    lastUpdate: wsLastUpdate,
    clearNewSignals 
  } = useWebSocketSignals()

  const [outcomeStats, setOutcomeStats] = useState<any>(null)
  const [activeStrategies, setActiveStrategies] = useState<number | null>(null)
  const [recentSignals, setRecentSignals] = useState<SignalPayloadPublicV1[]>([])
  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // New: symbols and strategies state
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null)
  
  // Live Ops: Market data heartbeat
  const [liveOpsSymbol, setLiveOpsSymbol] = useState<string>("XAUUSD")
  const [lastCandleTime, setLastCandleTime] = useState<number | null>(null)
  const [prevCandleTime, setPrevCandleTime] = useState<number | null>(null)
  const [candlePulse, setCandlePulse] = useState(false)
  const [candleError, setCandleError] = useState<string | null>(null)
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000))
  
  // Feed status from backend (anti-drift)
  const [feedStatus, setFeedStatus] = useState<any>(null)
  const [refreshingFeed, setRefreshingFeed] = useState(false)

  const detectorMetaMap = useMemo(() => {
    return new Map(DETECTOR_CATALOG.map((d) => [d.id, d]))
  }, [])

  const getDetectorLabel = useCallback((id: string) => {
    const meta = detectorMetaMap.get(id)
    if (!meta) return id
    return meta.labelMn ? `${meta.labelEn} · ${meta.labelMn}` : meta.labelEn
  }, [detectorMetaMap])

  const getDetectorGroup = useCallback((id: string): DetectorGroupKey => {
    const meta = detectorMetaMap.get(id)
    if (!meta) return "other"
    return meta.category || "other"
  }, [detectorMetaMap])

  const buildDetectorGroups = useCallback((detectors: string[]) => {
    const groups: Record<DetectorGroupKey, string[]> = {
      gate: [],
      trigger: [],
      confluence: [],
      other: [],
    }
    detectors.forEach((id) => {
      groups[getDetectorGroup(id)].push(id)
    })
    return groups
  }, [getDetectorGroup])

  const buildStrategyExplanation = useCallback((detectors: string[]) => {
    const has = (id: string) => detectors.includes(id)
    const notes: string[] = []

    if (has("GATE_REGIME")) notes.push("Зах зээлийн нөхцөлийг шүүж, хэт choppy үед оролтыг багасгана")
    if (has("GATE_VOLATILITY")) notes.push("Volatility‑ийн хэт бага/өндөр үед шүүлтүүр хийж false signal‑ийг бууруулна")
    if (has("GATE_DRIFT_SENTINEL")) notes.push("Хүчтэй drift үед эсрэг чиглэлд оролт хийх эрсдэлийг бууруулна")

    if (has("BOS")) notes.push("Structure break илэрмэгц трендийн үргэлжлэлийг барина")
    if (has("MOMENTUM_CONTINUATION")) notes.push("Хүчтэй momentum‑ын дараах continuation‑г баталгаажуулна")
    if (has("BREAK_RETEST")) notes.push("Breakout + retest үед илүү найдвартай оролт өгнө")
    if (has("SR_BOUNCE")) notes.push("Support/Resistance bounce нь range үед ажиллах боломж нэмнэ")
    if (has("MEAN_REVERSION_SNAPBACK")) notes.push("Overextended үед mean‑reversion оролтыг барина")
    if (has("SFP")) notes.push("Swing failure нь reversal‑ийг илрүүлэхэд тусална")

    if (has("FIBO_RETRACE_CONFLUENCE")) notes.push("Retrace бүс дээр нэмэлт баталгаажуулалт өгнө")
    if (has("FLAG_PENNANT")) notes.push("Continuation pattern‑оор трендийг улам баталгаажуулна")
    if (has("SR_ROLE_REVERSAL")) notes.push("Polarity flip нь breakout‑ын хүчийг баталгаажуулна")
    if (has("PINBAR_AT_LEVEL")) notes.push("Key level дээрх pinbar нь rejection‑ийг батална")
    if (has("PRICE_MOMENTUM_WEAKENING")) notes.push("Momentum‑ын суларлыг барьж reversal эрсдэлийг илрүүлнэ")

    const base = "AI тайлбар: Gate detectors нь зах зээлийг шүүж, trigger detectors нь оролтын дохиог өгч, confluence нь баталгаажуулалтыг нэмэгдүүлдэг."
    const extra = notes.length ? ` ${notes.join(". ")}.` : ""
    return `${base}${extra}`
  }, [])
  
  // Show toast when new signals arrive via WebSocket
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
  
  // Use WS signals if available, otherwise HTTP
  const displaySignals = useMemo(() => {
    if (wsConnected && wsSignals.length > 0) {
      // Return last 10 signals from WS
      return wsSignals
        .filter((s) => typeof s?.symbol === "string" && typeof s?.direction === "string")
        .slice(-10)
        .reverse() as SignalPayloadPublicV1[]
    }
    return recentSignals
  }, [wsConnected, wsSignals, recentSignals])

  const winRateText = useMemo(() => {
    const raw = outcomeStats?.win_rate ?? outcomeStats?.winrate
    if (raw === null || raw === undefined) return "—"
    const num = Number(raw)
    if (!Number.isFinite(num)) return "—"

    // Backend may return 0..1 or 0..100
    const pct = num <= 1 ? num * 100 : num
    return `${pct.toFixed(1)}%`
  }, [outcomeStats])

  const totalSignalsText = useMemo(() => {
    const direct = outcomeStats?.total_signals ?? outcomeStats?.total
    if (direct !== null && direct !== undefined) return String(direct)

    const wins = Number(outcomeStats?.wins ?? 0)
    const losses = Number(outcomeStats?.losses ?? 0)
    const pending = Number(outcomeStats?.pending ?? 0)
    const sum = wins + losses + pending
    return sum > 0 ? String(sum) : "—"
  }, [outcomeStats])

  const lastScanText = useMemo(() => {
    const raw = (engineStatus as any)?.last_scan_ts
    if (raw === null || raw === undefined) return null

    const num = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN
    if (!Number.isFinite(num)) return null
    if (num <= 0) return null

    // Heuristic: if timestamp looks like seconds, convert to ms.
    const ms = num < 1_000_000_000_000 ? num * 1000 : num
    if (ms < 946_684_800_000) return null // < year 2000 => probably invalid

    return new Date(ms).toLocaleString("mn-MN")
  }, [engineStatus])

  const refreshDashboard = async () => {
    setLoading(true)
    try {
      const [o, s, sigs, eng, syms] = await Promise.all([
        api.outcomes(30),
        api.strategies(),
        api.signals({ limit: 10 }),
        api.engineStatus(),
        api.symbols().catch(() => ({ ok: true, symbols: [] })),
      ])

      setOutcomeStats(o)

      // Parse symbols
      const symbolList = (syms as any)?.symbols || syms || []
      setSymbols(Array.isArray(symbolList) ? symbolList : [])

      // Parse strategies
      const strategiesList = (s as any)?.strategies || []
      if (Array.isArray(strategiesList)) {
        setStrategies(strategiesList)
        setActiveStrategies(strategiesList.filter((x: any) => x?.enabled).length)
        // Set selected to first enabled strategy
        const enabled = strategiesList.find((x: any) => x?.enabled)
        if (enabled && !selectedStrategyId) {
          setSelectedStrategyId(enabled.strategy_id)
        }
      } else {
        setActiveStrategies(null)
      }

      const normalizedSignals = Array.isArray(sigs) ? sigs : ((sigs as any)?.signals ?? [])
      setRecentSignals(normalizedSignals as SignalPayloadPublicV1[])

      setEngineStatus(eng)
    } catch (err: any) {
      toast({
        title: "Алдаа гарлаа",
        description: err?.message ?? "Dashboard ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Activate selected strategy and save
  const handleActivateStrategy = useCallback(async () => {
    if (!selectedStrategyId) {
      toast({ title: "Алдаа", description: "Стратеги сонгоно уу", variant: "destructive" })
      return
    }

    setSavingStrategy(true)
    try {
      // Enable selected strategy, disable others
      const updatedStrategies = strategies.map((s) => ({
        ...s,
        enabled: s.strategy_id === selectedStrategyId,
      }))

      const result = await api.updateStrategies({ strategies: updatedStrategies }) as { ok: boolean; error?: string }
      if (!result.ok) {
        throw new Error(result.error || "Хадгалж чадсангүй")
      }

      setStrategies(updatedStrategies)
      setActiveStrategies(1)
      
      toast({ 
        title: "Амжилттай", 
        description: `"${strategies.find(s => s.strategy_id === selectedStrategyId)?.name || selectedStrategyId}" стратеги идэвхжлээ` 
      })

      // Trigger a scan with new strategy
      await api.manualScan().catch(() => {})
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setSavingStrategy(false)
    }
  }, [selectedStrategyId, strategies, toast])

  useEffect(() => {
    if (status !== "authenticated") return
    refreshDashboard()

    const engineInterval = setInterval(() => {
      api.engineStatus().then(setEngineStatus).catch(() => {})
    }, 5000)

    const signalsInterval = setInterval(() => {
      api
        .signals({ limit: 10 })
        .then((sigs) => setRecentSignals(Array.isArray(sigs) ? (sigs as any) : ((sigs as any)?.signals ?? [])))
        .catch(() => {})
    }, 60_000)

    // Live Ops: Poll feed status from backend (anti-drift source of truth)
    const feedStatusInterval = setInterval(() => {
      api.feedStatus()
        .then((res: any) => {
          if (res?.ok !== false) {
            setFeedStatus(res)
            setCandleError(null)
            
            // Find the selected symbol's feed item
            const item = res?.items?.find((i: any) => i.symbol === liveOpsSymbol)
            if (item?.lastCandleTs) {
              const ts = Math.floor(new Date(item.lastCandleTs).getTime() / 1000)
              setPrevCandleTime((prev) => {
                if (prev !== null && ts > prev) {
                  setCandlePulse(true)
                  setTimeout(() => setCandlePulse(false), 2000)
                }
                return lastCandleTime
              })
              setLastCandleTime(ts)
            }
          }
        })
        .catch((err: any) => {
          // Fallback to candles endpoint if feed status not available
          if (liveOpsSymbol) {
            api.candles(liveOpsSymbol, "M5", 1)
              .then((res: any) => {
                const candles = res?.candles || res || []
                if (candles.length > 0) {
                  const candleTs = candles[0].time || candles[0].t || 0
                  const ts = typeof candleTs === "number" ? candleTs : Math.floor(new Date(candleTs).getTime() / 1000)
                  setLastCandleTime(ts)
                  setCandleError(null)
                }
              })
              .catch(() => {})
          }
        })
    }, 10_000) // Poll every 10 seconds
    
    // Live Ops: Update nowTs every second for countdown
    const tickInterval = setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000))
    }, 1000)

    // Initial feed status fetch
    api.feedStatus()
      .then((res: any) => {
        if (res?.ok !== false) {
          setFeedStatus(res)
          // Find the selected symbol's feed item
          const item = res?.items?.find((i: any) => i.symbol === liveOpsSymbol)
          if (item?.lastCandleTs) {
            const ts = Math.floor(new Date(item.lastCandleTs).getTime() / 1000)
            setLastCandleTime(ts)
          }
        }
      })
      .catch(() => {
        // Fallback to candles endpoint
        if (liveOpsSymbol) {
          api.candles(liveOpsSymbol, "M5", 1)
            .then((res: any) => {
              const candles = res?.candles || res || []
              if (candles.length > 0) {
                const candleTs = candles[0].time || candles[0].t || 0
                const ts = typeof candleTs === "number" ? candleTs : Math.floor(new Date(candleTs).getTime() / 1000)
                setLastCandleTime(ts)
              }
            })
            .catch(() => {})
        }
      })

    return () => {
      clearInterval(engineInterval)
      clearInterval(signalsInterval)
      clearInterval(feedStatusInterval)
      clearInterval(tickInterval)
    }
  }, [status, liveOpsSymbol])

  const handleManualScan = async () => {
    setLoading(true)
    try {
      const result = await api.manualScan()
      toast({
        title: "Амжилттай",
        description: `Scan эхэллээ${result?.scan_id ? ` (${result.scan_id})` : ""}`,
      })

      // Refresh signals & engine status right after scan
      const [eng, sigs] = await Promise.all([api.engineStatus(), api.signals({ limit: 10 })])
      setEngineStatus(eng)
      setRecentSignals(Array.isArray(sigs) ? (sigs as any) : ((sigs as any)?.signals ?? []))
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Live Ops computed values
  const candleAgeSec = useMemo(() => {
    if (!lastCandleTime) return null
    return Math.max(0, nowTs - lastCandleTime)
  }, [lastCandleTime, nowTs])

  const candleAgeText = useMemo(() => {
    if (candleAgeSec === null) return "—"
    const mins = Math.floor(candleAgeSec / 60)
    const secs = candleAgeSec % 60
    if (mins > 0) return `${mins}m ${secs}s ago`
    return `${secs}s ago`
  }, [candleAgeSec])

  // Next M5 candle expected time (candles close at :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55)
  const nextCandleIn = useMemo(() => {
    if (!lastCandleTime) return null
    // M5 candle closes every 5 minutes, next one = lastCandleTime + 300 seconds
    const nextCandleTs = lastCandleTime + 300
    const remaining = nextCandleTs - nowTs
    // If remaining < 0, means candle should have arrived but data provider is delayed
    return remaining
  }, [lastCandleTime, nowTs])

  const nextCandleText = useMemo(() => {
    if (nextCandleIn === null) return "—"
    if (nextCandleIn <= 0) {
      // Data provider is delayed
      const delayedBy = Math.abs(nextCandleIn)
      const mins = Math.floor(delayedBy / 60)
      const secs = delayedBy % 60
      return `delayed ${mins}m ${secs}s`
    }
    const mins = Math.floor(nextCandleIn / 60)
    const secs = nextCandleIn % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [nextCandleIn])

  const candleIsDelayed = useMemo(() => {
    return nextCandleIn !== null && nextCandleIn < -30 // delayed more than 30 seconds
  }, [nextCandleIn])

  // Market closed detection - now using backend rootCause (server-side detection)
  // Falls back to client-side guess if rootCause not available (old backend)
  const marketClosed = useMemo(() => {
    // Prefer backend rootCause from worst item
    if (feedStatus?.worst?.rootCause === "MARKET_CLOSED") {
      return true
    }
    // Also check current symbol in items
    const currentItem = feedStatus?.items?.find(
      (i: any) => i.symbol?.toUpperCase() === liveOpsSymbol.toUpperCase()
    )
    if (currentItem?.rootCause === "MARKET_CLOSED") {
      return true
    }
    // Fallback to client-side guess (for backward compat with old backend)
    return isMarketClosed(liveOpsSymbol, feedStatus?.serverTime)
  }, [liveOpsSymbol, feedStatus])

  // Get rootCause and reasonText for display
  const worstRootCause = feedStatus?.worst?.rootCause || null
  const worstReasonText = useMemo(() => {
    const input = feedStatus?.worst?.reasonText
    if (input === null || input === undefined) return null
    if (typeof input === "string") return input
    if (typeof input === "object") {
      const message = (input as any).message || (input as any).reasonText || (input as any).suggestion || (input as any).rootCause
      return typeof message === "string" ? message : JSON.stringify(input)
    }
    return String(input)
  }, [feedStatus?.worst?.reasonText])

  const scanCadenceSec = useMemo(() => {
    return (engineStatus as any)?.cadence_sec || 300
  }, [engineStatus])

  const lastScanTs = useMemo(() => {
    const raw = (engineStatus as any)?.last_scan_ts
    if (!raw) return 0
    const num = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(num)) return 0
    // If in ms, convert to seconds
    return num > 1_000_000_000_000 ? Math.floor(num / 1000) : num
  }, [engineStatus])

  const nextScanIn = useMemo(() => {
    if (!lastScanTs) return scanCadenceSec
    const elapsed = nowTs - lastScanTs
    return Math.max(0, scanCadenceSec - elapsed)
  }, [lastScanTs, nowTs, scanCadenceSec])

  const scanProgress = useMemo(() => {
    if (!scanCadenceSec) return 0
    return Math.min(1, 1 - nextScanIn / scanCadenceSec)
  }, [nextScanIn, scanCadenceSec])

  const justScanned = useMemo(() => {
    if (!lastScanTs) return false
    return nowTs - lastScanTs < 20
  }, [lastScanTs, nowTs])

  const nextScanText = useMemo(() => {
    const mins = Math.floor(nextScanIn / 60)
    const secs = nextScanIn % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [nextScanIn])

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Ачааллаж байна...</div>
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Сайн байна уу{session?.user?.email ? `, ${session.user.email}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleManualScan} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Now
            </Button>
            <Button variant="outline" onClick={refreshDashboard} disabled={loading}>
              Шинэчлэх
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Нийт дохио" value={totalSignalsText} subtitle="Сүүлийн статистик" icon={BarChart3} />
          <MetricCard title="Win rate" value={winRateText} subtitle="Ялалтын хувь" icon={Activity} />
          <MetricCard
            title="Идэвхтэй стратеги"
            value={activeStrategies === null ? "—" : activeStrategies}
            subtitle="Enabled стратегийн тоо"
            icon={Layers3}
          />
        </div>

        {/* Live Ops Status Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className={`h-5 w-5 ${justScanned ? "text-green-500 animate-pulse" : "text-primary"}`} />
              Live Ops
              {engineStatus?.running && (
                <Badge className="ml-auto bg-green-600 text-xs">Running</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Market Data Feed */}
              <div className="space-y-3 rounded-lg border p-4 bg-card/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${candlePulse ? "text-yellow-500 animate-pulse" : "text-muted-foreground"}`} />
                    Market Data Feed
                    {feedStatus?.provider?.healthy === false && (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-500">
                        Unhealthy
                      </Badge>
                    )}
                  </h4>
                  {candlePulse && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600 animate-pulse">
                      New candle ✅
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={liveOpsSymbol} onValueChange={setLiveOpsSymbol}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(symbols.length > 0 ? symbols : ["XAUUSD", "EURUSD", "GBPUSD"]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">M5</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={async () => {
                      setRefreshingFeed(true)
                      try {
                        await api.refreshFeed(liveOpsSymbol, "m5")
                        // Refetch status
                        const res = await api.feedStatus()
                        if (res?.ok !== false) setFeedStatus(res)
                      } catch {}
                      setRefreshingFeed(false)
                    }}
                    disabled={refreshingFeed}
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingFeed ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                {candleError ? (
                  <p className="text-xs text-destructive">{candleError}</p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last M5: </span>
                      <span className={`font-mono ${candleAgeSec && candleAgeSec < 60 ? "text-green-600" : ""}`}>
                        {candleAgeText}
                      </span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">Next in: </span>
                      <span className={`font-mono ${candleIsDelayed && !marketClosed ? "text-amber-500" : "text-muted-foreground"}`}>
                        {marketClosed ? "—" : nextCandleText}
                      </span>
                      {/* Market closed badge (from backend rootCause) */}
                      {marketClosed && (
                        <Badge variant="outline" className="text-xs text-blue-500 border-blue-500">
                          Market closed
                        </Badge>
                      )}
                      {/* Provider lag/rate limit badge (from backend rootCause) */}
                      {!marketClosed && worstRootCause === "PROVIDER_LAG" && (
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                          Provider lag
                        </Badge>
                      )}
                      {!marketClosed && worstRootCause === "PROVIDER_RATE_LIMIT" && (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                          Rate limited
                        </Badge>
                      )}
                      {!marketClosed && worstRootCause === "ENGINE_LAG" && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500">
                          Engine lag
                        </Badge>
                      )}
                      {!marketClosed && worstRootCause === "NO_DATA" && (
                        <Badge variant="outline" className="text-xs text-gray-500 border-gray-500">
                          No data
                        </Badge>
                      )}
                      {/* Fallback: client-side delayed detection if no rootCause from backend */}
                      {!marketClosed && !worstRootCause && candleIsDelayed && (
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                          Delayed
                        </Badge>
                      )}
                    </div>
                    {/* Hint using backend reasonText if available */}
                    {marketClosed && (
                      <div className="text-xs text-muted-foreground mt-1">
                        💤 {worstReasonText || "Forex market is closed (weekend). Crypto remains live."}
                      </div>
                    )}
                    {/* Backend rootCause hint when not market closed */}
                    {!marketClosed && worstReasonText && worstRootCause !== "OK" && (
                      <div className="text-xs text-amber-500 mt-1">
                        ⚠️ {worstReasonText} ({feedStatus?.worst?.symbol})
                      </div>
                    )}
                    {/* Fallback: old-style worst lag display if no rootCause */}
                    {!marketClosed && !worstRootCause && feedStatus?.worst && feedStatus.worst.lagSec > 300 && (
                      <div className="text-xs text-amber-500 mt-1">
                        ⚠️ Worst lag: {feedStatus.worst.symbol} ({Math.round(feedStatus.worst.lagSec)}s)
                      </div>
                    )}
                    {feedStatus?.summary?.itemsInBackoff > 0 && (
                      <div className="text-xs text-amber-500">
                        ⏳ {feedStatus.summary.itemsInBackoff} items rate-limited
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scan Heartbeat */}
              <div className="space-y-3 rounded-lg border p-4 bg-card/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${justScanned ? "text-green-500 animate-spin" : "text-muted-foreground"}`} />
                    Scan Heartbeat
                  </h4>
                  {justScanned && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Just scanned
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Next scan in:</span>
                    <span className="font-mono font-medium">{nextScanText}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${scanProgress * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cadence: {Math.floor(scanCadenceSec / 60)}m</span>
                    {lastScanText && <span>Last: {lastScanText}</span>}
                  </div>
                </div>

                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={handleManualScan}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  Manual Scan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Selector & All Symbols */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              Стратеги сонгох
            </CardTitle>
            <CardDescription>
              Стратеги сонгоод "Идэвхжүүлэх" дарснаар бүх хослол дээр тэр стратегигаар scan хийнэ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Select 
                  value={selectedStrategyId || ""} 
                  onValueChange={(v) => setSelectedStrategyId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Стратеги сонгох..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.strategy_id} value={s.strategy_id}>
                        <div className="flex items-center gap-2">
                          {s.enabled && <Check className="h-3 w-3 text-green-500" />}
                          <span>{formatStrategyName(s.name, s.strategy_id)}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {s.detectors?.length || 0} detector
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleActivateStrategy} 
                disabled={savingStrategy || !selectedStrategyId}
              >
                {savingStrategy ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Хадгалж байна...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Идэвхжүүлэх
                  </>
                )}
              </Button>
            </div>

            {/* Strategy Details */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Стратегийн дэлгэрэнгүй</h4>
                <span className="text-xs text-muted-foreground">{strategies.length} стратеги</span>
              </div>

              {strategies.map((s) => {
                const open = expandedStrategyId === s.strategy_id
                const displayName = formatStrategyName(s.name, s.strategy_id)
                const groups = buildDetectorGroups(s.detectors || [])
                const explanation = buildStrategyExplanation(s.detectors || [])

                return (
                  <div key={s.strategy_id} className="rounded-lg border p-4 bg-card/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">{s.strategy_id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.enabled && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600">
                            Default
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedStrategyId(open ? null : s.strategy_id)}
                        >
                          Дэлгэрэнгүй
                          <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {groups.gate.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Gate</div>
                              <div className="flex flex-wrap gap-2">
                                {groups.gate.map((id) => (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {getDetectorLabel(id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {groups.trigger.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Trigger</div>
                              <div className="flex flex-wrap gap-2">
                                {groups.trigger.map((id) => (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {getDetectorLabel(id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {groups.confluence.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Confluence</div>
                              <div className="flex flex-wrap gap-2">
                                {groups.confluence.map((id) => (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {getDetectorLabel(id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {groups.other.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Other</div>
                              <div className="flex flex-wrap gap-2">
                                {groups.other.map((id) => (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {getDetectorLabel(id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">AI тайлбар:</span> {explanation}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* All Symbols Grid */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Бүх хослолууд ({symbols.length})</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {symbols.map((symbol) => {
                  // Find last signal for this symbol
                  const lastSig = displaySignals.find((s) => s.symbol === symbol)
                  return (
                    <div
                      key={symbol}
                      className="rounded-lg border p-2 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                      title={lastSig ? `${lastSig.direction} @ ${lastSig.entry}` : "Дохиогүй"}
                    >
                      <div className="font-mono text-xs font-medium">{symbol}</div>
                      <div className="mt-1 flex justify-center">
                        {lastSig ? (
                          lastSig.direction === "BUY" ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : lastSig.direction === "SELL" ? (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System
              {/* WebSocket Connection Status */}
              <Badge 
                variant={wsConnected ? "default" : "secondary"} 
                className={`ml-auto flex items-center gap-1 text-xs ${wsConnected ? "bg-green-600" : ""}`}
              >
                {wsConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Polling
                  </>
                )}
              </Badge>
            </CardTitle>
            <CardDescription>Engine төлөв ба сүүлийн скан</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {engineStatus ? (
                <div className="space-y-1">
                  <div>
                    Төлөв: <span className={engineStatus.running ? "text-emerald-600" : "text-destructive"}>
                      {engineStatus.running ? "Ажиллаж байна" : "Зогссон"}
                    </span>
                  </div>
                  {lastScanText && (
                    <div>
                      Сүүлийн скан: <span className="font-mono text-xs">{lastScanText}</span>
                    </div>
                  )}
                </div>
              ) : (
                "Уншиж байна…"
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {wsConnected ? (
                <span className="text-green-600">Real-time updates · {wsLastUpdate?.toLocaleTimeString() || ""}</span>
              ) : (
                "Signals auto refresh: 60s · Engine: 5s"
              )}
            </div>
          </CardContent>
        </Card>

        <SignalsTable signals={displaySignals} limit={10} />
      </div>
    </DashboardLayout>
  )
}
