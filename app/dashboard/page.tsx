"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Activity, BarChart3, Layers3, Wifi, WifiOff, Bell, TrendingUp, TrendingDown, Minus, Check, ChevronDown, Radio, Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccessGateViewOnly } from "@/components/access-gate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard } from "@/components/metric-card"
import { useToast } from "@/hooks/use-toast"
import { useWebSocketSignals } from "@/hooks/use-websocket-signals"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"
import { DETECTOR_CATALOG } from "@/lib/detectors/catalog"
import { ActiveStrategiesPanel } from "@/components/active-strategies-panel"
import { SignalsHistoryPanel } from "@/components/signals-history-panel"
import { AdminLiveOpsPanel, ALL_SYMBOLS } from "@/components/admin-live-ops-panel"
import { mapOldSignalToUnified, type UnifiedSignal } from "@/lib/signals/unified"
import { useUserPlan } from "@/hooks/use-user-plan"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/contexts/language-context"
import { InfoTooltip } from "@/components/guide/info-tooltip"
import { OnboardingChecklist } from "@/components/onboarding-checklist"

// Admin email address for full Live Ops access
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || ""

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

// Deduplicate signals: same symbol + direction within 60 minutes = duplicate
function deduplicateSignals(signals: UnifiedSignal[]): UnifiedSignal[] {
  // Sort by ts descending (newest first)
  const sorted = [...signals].sort((a, b) => {
    const ta = new Date(a.ts).getTime()
    const tb = new Date(b.ts).getTime()
    return tb - ta
  })

  const deduped: UnifiedSignal[] = []
  for (const signal of sorted) {
    const ts = new Date(signal.ts).getTime()
    const duplicate = deduped.find(d => {
      if (d.symbol !== signal.symbol) return false
      const dDir = (d.direction || "").toLowerCase()
      const sDir = (signal.direction || "").toLowerCase()
      if (dDir !== sDir) return false
      const dTs = new Date(d.ts).getTime()
      return Math.abs(dTs - ts) < 3600000 // 60 minutes
    })
    if (!duplicate) {
      deduped.push(signal)
    }
  }
  return deduped
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
  const { t } = useLanguage()
  const uid = (session as any)?.user?.id || ""
  const { is_trial, trial_days_remaining, trial_expired } = useUserPlan()

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    const email = session?.user?.email?.toLowerCase()
    return email === ADMIN_EMAIL.toLowerCase()
  }, [session?.user?.email])
  
  // WebSocket real-time signals
  const { 
    signals: wsSignals, 
    newSignals, 
    connected: wsConnected, 
    lastUpdate: wsLastUpdate,
    clearNewSignals 
  } = useWebSocketSignals()

  const [recentSignals, setRecentSignals] = useState<SignalPayloadPublicV1[]>([])
  const [firestoreSignals, setFirestoreSignals] = useState<UnifiedSignal[]>([])
  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Symbol-Strategy mapping from Scanner Config
  const [symbols, setSymbols] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [activeStrategyMap, setActiveStrategyMap] = useState<Record<string, string>>({})
  const [symbolEnabled, setSymbolEnabled] = useState<Record<string, boolean>>({})
  
  // Engine status 247
  const [engineStatus247, setEngineStatus247] = useState<any>(null)
  
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
  
  // Admin: All 15 symbols candle data for Live Ops
  const [allSymbolsCandles, setAllSymbolsCandles] = useState<Record<string, number | null>>({})

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

    if (has("GATE_REGIME")) notes.push(t("Filters market conditions, reduces entries during choppy markets", "Зах зээлийн нөхцөлийг шүүж, хэт choppy үед оролтыг багасгана"))
    if (has("GATE_VOLATILITY")) notes.push(t("Filters extreme volatility to reduce false setups", "Volatility‑ийн хэт бага/өндөр үед шүүлтүүр хийж false setup‑ийг бууруулна"))
    if (has("GATE_DRIFT_SENTINEL")) notes.push(t("Reduces risk of counter-trend entries during strong drift", "Хүчтэй drift үед эсрэг чиглэлд оролт хийх эрсдэлийг бууруулна"))

    if (has("BOS")) notes.push(t("Captures trend continuation on structure break", "Structure break илэрмэгц трендийн үргэлжлэлийг барина"))
    if (has("MOMENTUM_CONTINUATION")) notes.push(t("Confirms continuation after strong momentum", "Хүчтэй momentum‑ын дараах continuation‑г баталгаажуулна"))
    if (has("BREAK_RETEST")) notes.push(t("Provides more reliable entry on breakout + retest", "Breakout + retest үед илүү найдвартай оролт өгнө"))
    if (has("SR_BOUNCE")) notes.push(t("Adds range trading opportunity via S/R bounce", "Support/Resistance bounce нь range үед ажиллах боломж нэмнэ"))
    if (has("MEAN_REVERSION_SNAPBACK")) notes.push(t("Captures mean-reversion entries when overextended", "Overextended үед mean‑reversion оролтыг барина"))
    if (has("SFP")) notes.push(t("Swing failure helps detect reversals", "Swing failure нь reversal‑ийг илрүүлэхэд тусална"))

    if (has("FIBO_RETRACE_CONFLUENCE")) notes.push(t("Adds extra confirmation at retrace zones", "Retrace бүс дээр нэмэлт баталгаажуулалт өгнө"))
    if (has("FLAG_PENNANT")) notes.push(t("Confirms trend via continuation pattern", "Continuation pattern‑оор трендийг улам баталгаажуулна"))
    if (has("SR_ROLE_REVERSAL")) notes.push(t("Confirms breakout strength via polarity flip", "Polarity flip нь breakout‑ын хүчийг баталгаажуулна"))
    if (has("PINBAR_AT_LEVEL")) notes.push(t("Confirms rejection via pinbar at key level", "Key level дээрх pinbar нь rejection‑ийг батална"))
    if (has("PRICE_MOMENTUM_WEAKENING")) notes.push(t("Detects reversal risk by catching momentum weakness", "Momentum‑ын суларлыг барьж reversal эрсдэлийг илрүүлнэ"))

    const base = t("AI explanation: Gate detectors filter the market, trigger detectors provide entry setups, and confluence adds confirmation.", "AI тайлбар: Gate detectors нь зах зээлийг шүүж, trigger detectors нь оролтын setup өгч, confluence нь баталгаажуулалтыг нэмэгдүүлдэг.")
    const extra = notes.length ? ` ${notes.join(". ")}.` : ""
    return `${base}${extra}`
  }, [t])
  
  // Show toast when new signals arrive via WebSocket
  useEffect(() => {
    if (newSignals.length > 0) {
      newSignals.forEach((signal) => {
        toast({
          title: `🔔 ${t("New setup", "Шинэ setup")}: ${signal.symbol}`,
          description: `${signal.direction} @ ${signal.entry}${signal.rr ? ` | RR: ${signal.rr.toFixed(2)}` : ""}`,
        })
      })
      clearNewSignals()
    }
  }, [newSignals, toast, clearNewSignals, t])
  
  // Use WS signals if available, otherwise HTTP - limit to 20
  const displaySignals = useMemo(() => {
    if (wsConnected && wsSignals.length > 0) {
      return wsSignals
        .filter((s) => typeof s?.symbol === "string" && typeof s?.direction === "string")
        .slice(-20)
        .reverse() as SignalPayloadPublicV1[]
    }
    return recentSignals.slice(0, 20)
  }, [wsConnected, wsSignals, recentSignals])

  // Handle entry tracking toggle
  const handleEntryToggle = useCallback(async (signalKey: string, taken: boolean) => {
    try {
      await api.updateSignalEntry(signalKey, taken)
      // Update local state immediately for instant UI feedback
      setFirestoreSignals(prev => prev.map(s => {
        const sKey = s.id.startsWith("signals:") ? s.id.slice(8) : s.id
        if (sKey === signalKey) {
          return { ...s, entry_taken: taken }
        }
        return s
      }))
      toast({
        title: taken ? t("✓ Added to entry list", "✓ Entry жагсаалтад орлоо") : t("✗ Removed from entry list", "✗ Entry жагсаалтаас хасагдлаа"),
        description: `Signal ${signalKey.slice(0, 8)}... ${t("saved successfully", "амжилттай хадгалагдлаа")}`,
      })
    } catch (err: any) {
      console.error("[handleEntryToggle] Error:", err)
      toast({
        title: t("Error", "Алдаа"),
        description: err.message || t("Failed to save entry tracking", "Entry tracking хадгалж чадсангүй"),
        variant: "destructive",
      })
    }
  }, [toast, t])

  // Calculate win rate from Firestore signals (entry_taken only, deduplicated)
  const winRateText = useMemo(() => {
    // Only count signals where entry was taken
    const takenSignals = firestoreSignals.filter(s => s.entry_taken === true)
    const wins = takenSignals.filter(s => s.outcome === "win").length
    const losses = takenSignals.filter(s => s.outcome === "loss").length
    const decided = wins + losses
    if (decided === 0) return "—"
    const pct = (wins / decided) * 100
    return `${pct.toFixed(1)}%`
  }, [firestoreSignals])

  // Total signals from Firestore (deduplicated)
  const totalSignalsText = useMemo(() => {
    if (firestoreSignals.length === 0) return "—"
    return String(firestoreSignals.length)
  }, [firestoreSignals])

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

  // Count active symbols (symbols with strategy mapping)
  const activeSymbolCount = useMemo(() => {
    return Object.entries(activeStrategyMap).filter(([sym, stratId]) =>
      stratId && (symbolEnabled[sym] !== false)
    ).length
  }, [activeStrategyMap, symbolEnabled])

  // Count unique active strategies
  const uniqueActiveStrategies = useMemo(() => {
    const strategyIds = new Set(
      Object.entries(activeStrategyMap)
        .filter(([sym, stratId]) => stratId && symbolEnabled[sym] !== false)
        .map(([, stratId]) => stratId)
    )
    return strategyIds.size
  }, [activeStrategyMap, symbolEnabled])

  const refreshDashboard = async () => {
    if (!uid) return
    setLoading(true)
    try {
      // Load backend strategies with symbol-strategy mapping + Firestore signals
      const [backendData, sigs, eng, syms, eng247, userSigsRes] = await Promise.all([
        api.backendStrategies.get(uid).catch(() => ({ ok: false, strategies: [], activeStrategyMap: {}, symbolEnabled: {} })),
        api.signals({ limit: 20 }),
        api.engineStatus(),
        api.symbols().catch(() => ({ ok: true, symbols: [] })),
        api.engineStatus247(uid).catch(() => null),
        api.userSignals({ limit: 500 }).catch(() => []),
      ])

      // Map Firestore signals to UnifiedSignal and deduplicate
      // Note: api.userSignals() returns normalized array directly (not { signals: [] })
      const rawUserSignals = Array.isArray(userSigsRes) ? userSigsRes : []
      const unifiedSignals = rawUserSignals.map((s: any) => mapOldSignalToUnified(s))
      const dedupedSignals = deduplicateSignals(unifiedSignals)
      setFirestoreSignals(dedupedSignals)

      // Parse symbols
      const symbolList = (syms as any)?.symbols || syms || []
      setSymbols(Array.isArray(symbolList) ? symbolList : [])

      // Parse strategies and mapping from backend
      if ((backendData as any)?.ok) {
        const bd = backendData as any
        setStrategies(bd.strategies || [])
        setActiveStrategyMap(bd.activeStrategyMap || {})
        setSymbolEnabled(bd.symbolEnabled || {})
      }

      // Engine status 247 (per-symbol details)
      if (eng247) {
        setEngineStatus247(eng247)
      }

      const normalizedSignals = Array.isArray(sigs) ? sigs : ((sigs as any)?.signals ?? [])
      setRecentSignals(normalizedSignals.slice(0, 20) as SignalPayloadPublicV1[])

      setEngineStatus(eng)
    } catch (err: any) {
      toast({
        title: t("An error occurred", "Алдаа гарлаа"),
        description: err?.message ?? t("Failed to load dashboard", "Dashboard ачаалж чадсангүй"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !uid) return
    refreshDashboard()

    const engineInterval = setInterval(() => {
      api.engineStatus().then(setEngineStatus).catch(() => {})
      if (uid) {
        api.engineStatus247(uid).then(setEngineStatus247).catch(() => {})
      }
    }, 5000)

    const signalsInterval = setInterval(() => {
      api
        .signals({ limit: 10 })
        .then((sigs) => setRecentSignals(Array.isArray(sigs) ? (sigs as any) : ((sigs as any)?.signals ?? [])))
        .catch(() => {})
    }, 60_000)

    // Firestore signals auto-refresh (30 sec) — SL/TP outcome auto-detect
    const firestoreInterval = setInterval(async () => {
      if (!uid) return
      try {
        const res = await api.userSignals({ limit: 500 })
        const raw = Array.isArray(res) ? res : []
        const unified = raw.map((s: any) => mapOldSignalToUnified(s))
        const deduped = deduplicateSignals(unified)

        setFirestoreSignals(prev => {
          // Detect outcome changes → toast notification
          for (const sig of deduped) {
            const old = prev.find(p => p.id === sig.id)
            if (old && !old.outcome && sig.outcome === "win") {
              toast({ title: `${t("TP hit", "TP цохисон")}: ${sig.symbol}`, description: `${sig.direction === "long" ? "BUY" : "SELL"} — RR: ${sig.rr?.toFixed(2) ?? "—"}` })
            } else if (old && !old.outcome && sig.outcome === "loss") {
              toast({ title: `${t("SL hit", "SL цохисон")}: ${sig.symbol}`, description: `${sig.direction === "long" ? "BUY" : "SELL"}`, variant: "destructive" })
            }
          }
          return deduped
        })
      } catch {}
    }, 30_000)

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
                return ts
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
      clearInterval(firestoreInterval)
      clearInterval(feedStatusInterval)
      clearInterval(tickInterval)
    }
  }, [status, liveOpsSymbol, t])

  // Admin: Fetch all 15 symbols' candle data for Live Ops panel
  useEffect(() => {
    if (!isAdmin) return
    
    const fetchAllSymbolsCandles = async () => {
      const results: Record<string, number | null> = {}
      
      // Fetch candles for all symbols in parallel
      await Promise.all(
        ALL_SYMBOLS.map(async (symbol) => {
          try {
            const res = await api.candles(symbol, "M5", 1)
            const candles = (res as any)?.candles || res || []
            if (candles.length > 0) {
              const candleTs = candles[0].time || candles[0].t || 0
              const ts = typeof candleTs === "number" 
                ? candleTs 
                : Math.floor(new Date(candleTs).getTime() / 1000)
              results[symbol] = ts
            } else {
              results[symbol] = null
            }
          } catch {
            results[symbol] = null
          }
        })
      )
      
      setAllSymbolsCandles(results)
    }
    
    // Initial fetch
    fetchAllSymbolsCandles()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchAllSymbolsCandles, 30_000)
    
    return () => clearInterval(interval)
  }, [isAdmin])

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
    return <div className="flex min-h-screen items-center justify-center">{t("Loading...", "Ачааллаж байна...")}</div>
  }

  if (!session) {
    return null
  }

  return (
    <AccessGateViewOnly feature="dashboard">
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("Dashboard", "Хянах самбар")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Welcome", "Сайн байна уу")}{session?.user?.email ? `, ${session.user.email}` : ""}
            </p>
          </div>
        </div>

        {/* Trial Banner */}
        {is_trial && !trial_expired && trial_days_remaining !== undefined && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-500">
                  {t("Free Trial", "Үнэгүй туршилт")} — {trial_days_remaining} {t("days remaining", "хоног үлдсэн")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Upgrade to keep access after trial ends", "Туршилт дуусахаас өмнө план сонгоно уу")}
                </p>
              </div>
            </div>
            <a href="/pricing" className="text-xs font-medium bg-amber-500 text-black px-3 py-1.5 rounded-md hover:bg-amber-400 transition-colors">
              {t("Upgrade", "Сунгах")}
            </a>
          </div>
        )}
        {is_trial && trial_expired && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-500">
                  {t("Trial Expired", "Туршилт дууссан")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Select a plan to continue using all features", "Бүх боломжийг ашиглахын тулд план сонгоно уу")}
                </p>
              </div>
            </div>
            <a href="/pricing" className="text-xs font-medium bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-400 transition-colors">
              {t("Choose Plan", "План сонгох")}
            </a>
          </div>
        )}

        {/* Onboarding Checklist (auto-hides when complete) */}
        <OnboardingChecklist />

        {/* Scanner Status Bar */}
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
          marketClosed
            ? "bg-amber-500/10 text-amber-600"
            : "bg-green-500/10 text-green-600"
        }`}>
          <span className="relative flex h-2 w-2 shrink-0">
            {!marketClosed && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${marketClosed ? "bg-amber-500" : "bg-green-500"}`} />
          </span>
          {marketClosed ? (
            <span>{t("Forex market closed — Crypto scanning 24/7", "Forex зах зээл хаалттай — Crypto 24/7 ажиллаж байна")}</span>
          ) : (
            <span>
              {t("Scanner active", "Scanner идэвхтэй")} — 15 {t("pairs", "хос")}, {t("every 5 min", "5 мин тутам")}
              {recentSignals.length > 0 && <> | {recentSignals.length} {t("signals", "дохио")}</>}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3" data-tour="status-cards">
          <MetricCard title={<span className="flex items-center gap-1">{t("Total Setups", "Нийт setup")} <InfoTooltip textMn="Сүүлийн хугацаанд олдсон нийт setup-ийн тоо" textEn="Total number of setups found recently" /></span>} value={totalSignalsText} subtitle={t("Recent stats", "Сүүлийн статистик")} icon={BarChart3} />
          <MetricCard title={<span className="flex items-center gap-1">{t("Win Rate", "Ялалтын хувь")} <InfoTooltip textMn="TP хүрсэн trade-ийн хувь. 30-45% нь R:R 2.5+ үед сайн" textEn="Percentage of trades that hit TP. 30-45% is good with RR 2.5+" /></span>} value={winRateText} subtitle={t("Success rate", "Амжилтын хувь")} icon={Activity} />
          <MetricCard
            title={<span className="flex items-center gap-1">{t("Active Strategies", "Идэвхтэй стратеги")} <InfoTooltip textMn="Идэвхжүүлсэн стратеги + symbol хослолын тоо" textEn="Number of enabled strategy-symbol combinations" /></span>}
            value={uniqueActiveStrategies || "—"}
            subtitle={`${activeSymbolCount} ${t("symbol-strategy pairs", "symbol-стратеги хос")}`}
            icon={Layers3}
          />
        </div>

        {/* Market Status Panel - All 15 Symbols (All Users) */}
        <AdminLiveOpsPanel
          feedStatus={feedStatus}
          engineStatus247={engineStatus247}
          allSymbolsCandles={allSymbolsCandles}
          nowTs={nowTs}
        />


        {/* Active Strategies - Scanner Config-оос идэвхжүүлсэн */}
        <Card data-tour="strategies-panel">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              {t("Active combinations", "Идэвхтэй хослолууд")} ({activeSymbolCount})
              {wsConnected && (
                <Badge className="ml-auto bg-green-600 text-xs flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("Symbol-strategy combinations enabled from scanner config", "Скан тохиргооноос идэвхжүүлсэн symbol-стратеги хослолууд")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Explanation */}
            <div className="text-xs bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4 space-y-1.5">
              <p className="font-medium text-blue-600">{t("💡 What does this show?", "💡 Энэ юу харуулдаг вэ?")}</p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">{t("Scanner Config", "Скан тохиргоо")}</span> {t("shows symbol-strategy combinations enabled on the config page. Scanner checks these every 5 minutes and sends notifications when setups are found.", "хуудсанд идэвхжүүлсэн symbol болон стратегийн хослолууд энд харагдана. Scanner эдгээр хослолуудыг 5 минут тутамд шалгаж, setup олдвол мэдэгдэл илгээнэ.")}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground mt-1">
                <span>• <span className="text-green-500">{t("Green", "Ногоон")}</span> = {t("Latest setup", "Сүүлийн setup")}</span>
                <span>• {t("Click symbol for details", "Symbol дарж дэлгэрэнгүй харах")}</span>
              </div>
            </div>
            <ActiveStrategiesPanel
              activeStrategyMap={activeStrategyMap}
              symbolEnabled={symbolEnabled}
              strategies={strategies}
              engineStatus247={engineStatus247}
              feedStatus={feedStatus}
              lastSignals={Object.fromEntries(
                displaySignals.map((s) => [s.symbol, { direction: s.direction, entry: s.entry ?? 0, time: s.ts || "" }])
              )}
              onSymbolClick={(symbol) => setLiveOpsSymbol(symbol)}
            />
          </CardContent>
        </Card>

        {/* Signals History with Entry Tracking (last 20) - uses firestoreSignals for deduplication + entry tracking */}
        <div data-tour="signals-panel">
        <SignalsHistoryPanel
          signals={firestoreSignals.slice(0, 20).map((s) => ({
            // Extract actual signal_key from UnifiedSignal.id (format: "signals:ACTUAL_KEY")
            signal_id: s.id.startsWith("signals:") ? s.id.slice(8) : s.id,
            symbol: s.symbol,
            direction: s.direction === "long" ? "BUY" : s.direction === "short" ? "SELL" : "—",
            entry: s.entry ?? 0,
            tp: s.tp,
            sl: s.sl,
            rr: s.rr,
            timestamp: s.ts,
            entry_taken: s.entry_taken ?? null,
            outcome: s.outcome === "expired" ? "pending" : s.outcome ?? null,
          }))}
          onEntryToggle={handleEntryToggle}
          showWinRate={true}
        />
        </div>
      </div>
    </DashboardLayout>
    </AccessGateViewOnly>
  )
}
