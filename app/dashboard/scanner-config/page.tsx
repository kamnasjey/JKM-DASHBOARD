"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  Layers,
  Save,
  AlertCircle,
  Check,
  RefreshCw,
  Radio,
  Zap,
  Clock,
  Settings2,
  ChevronDown,
  X,
  Activity,
  AlertTriangle,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

// Default 15 symbols (must match backend)
const DEFAULT_15_SYMBOLS = [
  "EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCAD",
  "USDCHF", "NZDUSD", "EURJPY", "GBPJPY", "EURGBP",
  "AUDJPY", "EURAUD", "EURCHF", "XAUUSD", "BTCUSD",
]

interface Strategy {
  id: string
  name: string
  detectors: string[]
  symbols: string[]
  timeframes: string[]
  minRR: number
  enabled: boolean
  tags?: string[]
  isStarterClone?: boolean
}

interface EffectiveSymbol {
  symbol: string
  strategyIdUsed: string
  strategyNameUsed?: string
  isMapped: boolean
  lastScanTs?: string
  lastSetupFoundTs?: string
  setupsFound24h?: number  // 24h count from backend
  delayReason?: string
  lagSec?: number
  lastCandleTs?: string
}

interface EngineStatus {
  ok: boolean
  uid: string
  engineRunning: boolean
  scanMode: string
  lastCycleTs: string
  lastOutcome?: {
    cycle: number
    ts: string
    symbolsScanned: number
    setupsFound: number
    rootCause: string
    noSetupReasons?: Record<string, number>
    marketClosedSymbols?: string[]
  }
  effectiveSymbols: EffectiveSymbol[]
  error?: string
}

// Status pill component with detailed reasons
function StatusPill({ status, reason }: { status: string; reason?: string }) {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode; tooltip: string }> = {
    OK: { 
      label: "OK", 
      color: "bg-green-500/20 text-green-400 border-green-500/30", 
      icon: <Check className="h-3 w-3" />,
      tooltip: "Scanner хэвийн ажиллаж байна"
    },
    PROVIDER_LAG: { 
      label: "Lag", 
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", 
      icon: <Clock className="h-3 w-3" />,
      tooltip: "Data provider-ээс удаашралтай өгөгдөл ирж байна"
    },
    ENGINE_BEHIND: { 
      label: "Behind", 
      color: "bg-red-500/20 text-red-400 border-red-500/30", 
      icon: <AlertTriangle className="h-3 w-3" />,
      tooltip: "Scanner engine удааширсан байна"
    },
    MARKET_CLOSED: { 
      label: "Closed", 
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30", 
      icon: <X className="h-3 w-3" />,
      tooltip: "Зах зээл хаалттай (амралтын өдөр эсвэл trading session хаагдсан)"
    },
    NO_NEW_CANDLE_YET: { 
      label: "Waiting", 
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
      icon: <Clock className="h-3 w-3" />,
      tooltip: "Шинэ candle хүлээж байна"
    },
    NO_DATA: {
      label: "No Data",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: <AlertCircle className="h-3 w-3" />,
      tooltip: "Өгөгдөл байхгүй байна"
    },
    ERROR: {
      label: "Error",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: <AlertTriangle className="h-3 w-3" />,
      tooltip: "Scan алдаа гарсан"
    },
  }

  const config = configs[status] || configs.OK
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`${config.color} gap-1 text-xs`}>
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason || config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Format timestamp relative
function formatRelativeTime(ts: string | undefined): string {
  if (!ts) return "-"
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    return `${hr}h ago`
  } catch {
    return "-"
  }
}

export default function ScannerConfigPage() {
  useAuthGuard(true)
  const { data: session } = useSession()
  const { toast } = useToast()
  const uid = (session?.user as any)?.id || ""

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [activeStrategyId, setActiveStrategyId] = useState<string>("")
  const [activeStrategyMap, setActiveStrategyMap] = useState<Record<string, string>>({})
  const [pendingMap, setPendingMap] = useState<Record<string, string | null>>({})
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Polling ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data
  const loadData = useCallback(async () => {
    if (!uid) return
    
    try {
      const data = await api.backendStrategies.get(uid)
      if (data.ok) {
        setStrategies(data.strategies || [])
        setActiveStrategyId(data.activeStrategyId || "")
        setActiveStrategyMap(data.activeStrategyMap || {})
        setPendingMap({})
        setAuthError(null)
      } else {
        throw new Error("Failed to load strategies")
      }
    } catch (err: any) {
      console.error("[scanner-config] load error:", err)
      if (err.message?.includes("auth") || err.message?.includes("401") || err.message?.includes("403")) {
        setAuthError("Internal auth missing - check INTERNAL_API_KEY")
      }
      toast({
        title: "Алдаа",
        description: "Стратегиуд ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [uid, toast])

  // Load engine status
  const loadEngineStatus = useCallback(async () => {
    if (!uid) return
    
    try {
      const data = await api.engineStatus247(uid)
      setEngineStatus(data)
      setStatusError(null)
    } catch (err: any) {
      console.error("[scanner-config] status error:", err)
      setStatusError(err.message || "Engine offline")
      setEngineStatus(null)
    }
  }, [uid])

  // Initial load
  useEffect(() => {
    if (uid) {
      loadData()
      loadEngineStatus()
    }
  }, [uid, loadData, loadEngineStatus])

  // Status polling (every 10 seconds)
  useEffect(() => {
    if (!uid) return

    pollIntervalRef.current = setInterval(() => {
      loadEngineStatus()
    }, 10000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [uid, loadEngineStatus])

  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingMap).length > 0

  // Handle global active strategy change
  const handleActiveStrategyChange = async (strategyId: string) => {
    if (!uid || !strategyId) return

    setSaving(true)
    try {
      const result = await api.backendStrategies.setActiveStrategy(uid, strategyId)
      if (result.ok) {
        setActiveStrategyId(strategyId)
        toast({
          title: "Амжилттай",
          description: "Үндсэн стратеги сонгогдлоо",
        })
        // Refresh status to show updated effectiveStrategy
        loadEngineStatus()
      }
    } catch (err: any) {
      console.error("[scanner-config] set active error:", err)
      toast({
        title: "Алдаа",
        description: err.message || "Хадгалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle per-symbol strategy change (local only until save)
  const handleSymbolStrategyChange = (symbol: string, strategyId: string | null) => {
    setPendingMap(prev => {
      const newMap = { ...prev }
      if (strategyId === null || strategyId === "") {
        // Clear override - set to null to signal removal
        newMap[symbol] = null
      } else if (strategyId === activeStrategyMap[symbol]) {
        // Same as current - remove from pending
        delete newMap[symbol]
      } else {
        newMap[symbol] = strategyId
      }
      return newMap
    })
  }

  // Save pending map changes
  const handleSaveMap = async () => {
    if (!uid || !hasUnsavedChanges) return

    setSaving(true)
    try {
      // Merge pending into current map for the request
      const newMap = { ...activeStrategyMap }
      for (const [symbol, strategyId] of Object.entries(pendingMap)) {
        if (strategyId === null) {
          delete newMap[symbol]
        } else {
          newMap[symbol] = strategyId
        }
      }

      const result = await api.backendStrategies.setStrategyMap(uid, newMap)
      if (result.ok) {
        setActiveStrategyMap(result.activeStrategyMap || newMap)
        setPendingMap({})
        toast({
          title: "Амжилттай",
          description: "Symbol mapping хадгалагдлаа",
        })
        // Refresh status to show updated effectiveStrategy
        loadEngineStatus()
      }
    } catch (err: any) {
      console.error("[scanner-config] save map error:", err)
      toast({
        title: "Алдаа",
        description: err.message || "Хадгалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Get effective strategy for a symbol (considering pending changes)
  const getEffectiveStrategy = (symbol: string): { id: string; name: string; isMapped: boolean; isPending: boolean } => {
    // Check pending first
    if (symbol in pendingMap) {
      const pendingId = pendingMap[symbol]
      if (pendingId === null) {
        // Clearing override - fallback to active
        const strat = strategies.find(s => s.id === activeStrategyId)
        return { id: activeStrategyId, name: strat?.name || "Default", isMapped: false, isPending: true }
      }
      const strat = strategies.find(s => s.id === pendingId)
      return { id: pendingId, name: strat?.name || pendingId, isMapped: true, isPending: true }
    }
    
    // Check current map
    const mappedId = activeStrategyMap[symbol]
    if (mappedId) {
      const strat = strategies.find(s => s.id === mappedId)
      return { id: mappedId, name: strat?.name || mappedId, isMapped: true, isPending: false }
    }
    
    // Fallback to active strategy
    const strat = strategies.find(s => s.id === activeStrategyId)
    return { id: activeStrategyId, name: strat?.name || "Default", isMapped: false, isPending: false }
  }

  // Get current dropdown value for a symbol
  const getDropdownValue = (symbol: string): string => {
    if (symbol in pendingMap) {
      return pendingMap[symbol] || "__default__"
    }
    return activeStrategyMap[symbol] || "__default__"
  }

  // Get status info for a symbol from engine status
  const getSymbolStatus = (symbol: string): EffectiveSymbol | null => {
    return engineStatus?.effectiveSymbols?.find(s => s.symbol === symbol) || null
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              Scanner Strategy Config
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              24/7 Scanner-ийн strategy тохиргоо ба per-symbol mapping
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadData(); loadEngineStatus(); }}
            disabled={saving}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {authError} - Backend холболт тохируулна уу
            </AlertDescription>
          </Alert>
        )}

        {/* Engine Stopped Banner */}
        {!loading && engineStatus && !engineStatus.engineRunning && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>24/7 Scanner зогссон байна</strong> — Scan хийгдэхгүй байна. Admin тусламж авна уу.
              </span>
              <Badge variant="destructive" className="ml-4">Engine Stopped</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* 24/7 Engine Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                24/7 Engine Status
              </CardTitle>
              {engineStatus?.engineRunning ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Running
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {statusError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            ) : engineStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="ml-2 font-medium">{engineStatus.scanMode || "TICK"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Cycle:</span>
                  <span className="ml-2 font-medium">{formatRelativeTime(engineStatus.lastCycleTs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Symbols:</span>
                  <span className="ml-2 font-medium">{engineStatus.lastOutcome?.symbolsScanned || 15}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Setups Found:</span>
                  <span className="ml-2 font-medium text-green-400">{engineStatus.lastOutcome?.setupsFound || 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Status уншиж байна...</p>
            )}
          </CardContent>
        </Card>

        {/* Active Strategy Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Active Strategy (Global Default)
            </CardTitle>
            <CardDescription>
              Symbol-д override тохируулаагүй бол энэ стратегийг ашиглана
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select
                value={activeStrategyId}
                onValueChange={handleActiveStrategyChange}
                disabled={saving || strategies.length === 0}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Стратеги сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      <div className="flex items-center gap-2">
                        <span>{strategy.name}</span>
                        {strategy.isStarterClone && (
                          <Badge variant="outline" className="text-xs">Starter</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeStrategyId && (
                <Badge variant="secondary">
                  {strategies.find(s => s.id === activeStrategyId)?.detectors?.length || 0} detectors
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Per-Symbol Strategy Mapping Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5" />
                  Per-Symbol Strategy Mapping
                </CardTitle>
                <CardDescription>
                  Symbol бүрт өөр стратеги оноож болно
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved
                  </Badge>
                )}
                <Button
                  onClick={handleSaveMap}
                  disabled={saving || !hasUnsavedChanges}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Mapping
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Symbol</TableHead>
                    <TableHead className="w-[200px]">Assigned Strategy</TableHead>
                    <TableHead className="w-[180px]">Effective Strategy</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px]">Lag</TableHead>
                    <TableHead className="w-[100px]">Last Scan</TableHead>
                    <TableHead className="w-[100px]">Setups</TableHead>
                    <TableHead className="w-[60px]">Clear</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEFAULT_15_SYMBOLS.map((symbol) => {
                    const effective = getEffectiveStrategy(symbol)
                    const dropdownValue = getDropdownValue(symbol)
                    const symbolStatus = getSymbolStatus(symbol)
                    const hasPendingChange = symbol in pendingMap

                    return (
                      <TableRow key={symbol} className={hasPendingChange ? "bg-yellow-500/5" : ""}>
                        <TableCell className="font-medium">{symbol}</TableCell>
                        <TableCell>
                          <Select
                            value={dropdownValue}
                            onValueChange={(val) => handleSymbolStrategyChange(symbol, val === "__default__" ? null : val)}
                            disabled={saving}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__default__">
                                <span className="text-muted-foreground">Use Default</span>
                              </SelectItem>
                              {strategies.map((strategy) => (
                                <SelectItem key={strategy.id} value={strategy.id}>
                                  {strategy.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${effective.isPending ? "text-yellow-400" : ""}`}>
                              {effective.name}
                            </span>
                            {effective.isMapped && !effective.isPending && (
                              <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                                Override
                              </Badge>
                            )}
                            {effective.isPending && (
                              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={symbolStatus?.delayReason || "OK"}
                            reason={symbolStatus?.delayReason}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {symbolStatus?.lagSec != null && symbolStatus.lagSec >= 0 ? `${symbolStatus.lagSec}s` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelativeTime(symbolStatus?.lastScanTs)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {symbolStatus?.setupsFound24h != null ? (
                            <span className={symbolStatus.setupsFound24h > 0 ? "text-green-400 font-medium" : "text-muted-foreground"}>
                              {symbolStatus.setupsFound24h}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {(activeStrategyMap[symbol] || pendingMap[symbol]) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleSymbolStrategyChange(symbol, null)}
                              disabled={saving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Strategies List Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" />
              Available Strategies ({strategies.length})
            </CardTitle>
            <CardDescription>
              Scanner-д ашиглах боломжтой стратегиуд
            </CardDescription>
          </CardHeader>
          <CardContent>
            {strategies.length === 0 ? (
              <p className="text-muted-foreground text-sm">Стратеги олдсонгүй</p>
            ) : (
              <div className="grid gap-3">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className={`p-3 rounded-lg border ${
                      strategy.id === activeStrategyId
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strategy.name}</span>
                        {strategy.isStarterClone && (
                          <Badge variant="outline" className="text-xs">Starter</Badge>
                        )}
                        {strategy.id === activeStrategyId && (
                          <Badge className="bg-primary/20 text-primary text-xs">Active</Badge>
                        )}
                        {!strategy.enabled && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{strategy.detectors?.length || 0} detectors</span>
                        <span>•</span>
                        <span>{strategy.timeframes?.join(", ") || "m5"}</span>
                        <span>•</span>
                        <span>RR ≥ {strategy.minRR || 2.0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
