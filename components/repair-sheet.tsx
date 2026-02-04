"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Play,
  Square,
  Trash2,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RepairSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type HealthStatus = {
  ok: boolean
  uptime_s?: number
  signals_count?: number
  cache_ready?: boolean
  symbols_count?: number
  sim_queue_size?: number
  error?: string
}

type WebSocketStatus = {
  tested: boolean
  connected: boolean
  error: string | null
}

export function RepairSheet({ open, onOpenChange }: RepairSheetProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({ tested: false, connected: false, error: null })

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL

  // Check backend health
  const checkHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/proxy/health", { cache: "no-store" })
      if (!res.ok) {
        setHealth({ ok: false, error: `HTTP ${res.status}` })
        return
      }
      const data = await res.json()
      setHealth({
        ok: data.ok ?? false,
        uptime_s: data.uptime_s,
        signals_count: data.signals_lines_estimate,
        cache_ready: data.cache?.ready,
        symbols_count: data.cache?.symbols,
        sim_queue_size: data.sim_queue?.size ?? 0,
      })
    } catch (err: any) {
      setHealth({ ok: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  // Test WebSocket
  const testWebSocket = useCallback(async () => {
    if (!wsUrl) {
      setWsStatus({ tested: true, connected: false, error: "WS URL тохируулаагүй" })
      return
    }

    try {
      const ws = new WebSocket(`${wsUrl}/ws/signals`)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error("Timeout"))
        }, 5000)

        ws.onopen = () => {
          clearTimeout(timeout)
          setWsStatus({ tested: true, connected: true, error: null })
          ws.close()
          resolve()
        }

        ws.onerror = () => {
          clearTimeout(timeout)
          reject(new Error("Холбогдож чадсангүй"))
        }
      })
    } catch (err: any) {
      setWsStatus({ tested: true, connected: false, error: err.message })
    }
  }, [wsUrl])

  // Restart Backend
  const restartBackend = async () => {
    setActionLoading("restart")
    try {
      const res = await fetch("/api/admin/backend/restart", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Restart амжилтгүй")
      }
      toast({
        title: "Амжилттай",
        description: "Backend restart хийгдлээ. 10 секунд хүлээнэ үү.",
      })
      // Wait and recheck health
      setTimeout(() => {
        checkHealth()
        testWebSocket()
      }, 10000)
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Backend restart амжилтгүй",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Clear Simulator Queue
  const clearSimQueue = async () => {
    setActionLoading("clear-queue")
    try {
      const res = await fetch("/api/admin/simulator/clear-queue", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Queue цэвэрлэх амжилтгүй")
      }
      toast({
        title: "Амжилттай",
        description: "Simulator queue цэвэрлэгдлээ",
      })
      checkHealth()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Queue цэвэрлэх амжилтгүй",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Start Scanner
  const startScanner = async () => {
    setActionLoading("start-scanner")
    try {
      const res = await fetch("/api/proxy/engine/start", { method: "POST" })
      if (!res.ok) throw new Error("Start амжилтгүй")
      toast({ title: "Амжилттай", description: "Scanner эхэллээ" })
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  // Stop Scanner
  const stopScanner = async () => {
    setActionLoading("stop-scanner")
    try {
      const res = await fetch("/api/proxy/engine/stop", { method: "POST" })
      if (!res.ok) throw new Error("Stop амжилтгүй")
      toast({ title: "Амжилттай", description: "Scanner зогслоо" })
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  // Refresh Cache
  const refreshCache = async () => {
    setActionLoading("refresh-cache")
    try {
      const res = await fetch("/api/proxy/market/feed/refresh", { method: "POST" })
      if (!res.ok) throw new Error("Refresh амжилтгүй")
      toast({ title: "Амжилттай", description: "Cache refresh хийгдлээ" })
      checkHealth()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  // Run checks when opened
  useEffect(() => {
    if (open) {
      checkHealth()
      testWebSocket()
    }
  }, [open, checkHealth, testWebSocket])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}ц ${mins}мин`
    return `${mins}мин`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Засварын газар
          </SheetTitle>
          <SheetDescription>
            Системийн статус шалгах, түргэн засвар хийх
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Backend Status */}
            <Card className={health?.ok ? "border-green-500/30" : "border-red-500/30"}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Server className="h-3 w-3" />
                  Backend
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : health?.ok ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">OK</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Алдаа</span>
                  </div>
                )}
                {health?.uptime_s && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Uptime: {formatUptime(health.uptime_s)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WebSocket Status */}
            <Card className={wsStatus.connected ? "border-green-500/30" : "border-yellow-500/30"}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {wsStatus.connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  WebSocket
                </div>
                {wsStatus.connected ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Холбогдсон</span>
                  </div>
                ) : wsStatus.tested ? (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">Салсан</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Шалгаж байна...</span>
                )}
              </CardContent>
            </Card>

            {/* Cache Status */}
            <Card className={health?.cache_ready ? "border-green-500/30" : "border-yellow-500/30"}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Cache</div>
                {health?.cache_ready ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{health.symbols_count} symbols</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">Бэлэн биш</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Simulator Queue */}
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Sim Queue</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-mono">{health?.sim_queue_size ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">jobs</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => { checkHealth(); testWebSocket() }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Дахин шалгах
          </Button>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Түргэн засвар</h4>

            {/* Restart Backend - Main action */}
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={restartBackend}
              disabled={actionLoading === "restart"}
            >
              {actionLoading === "restart" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Backend Restart
              <Badge variant="outline" className="ml-auto text-[10px]">
                Удаан бол
              </Badge>
            </Button>

            {/* Scanner Controls */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startScanner}
                disabled={actionLoading === "start-scanner"}
              >
                {actionLoading === "start-scanner" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start Scanner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stopScanner}
                disabled={actionLoading === "stop-scanner"}
              >
                {actionLoading === "stop-scanner" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Stop Scanner
              </Button>
            </div>

            {/* Cache & Queue */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCache}
                disabled={actionLoading === "refresh-cache"}
              >
                {actionLoading === "refresh-cache" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refresh Cache
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSimQueue}
                disabled={actionLoading === "clear-queue" || (health?.sim_queue_size ?? 0) === 0}
              >
                {actionLoading === "clear-queue" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Clear Queue
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p><strong>Backend Restart:</strong> Simulator удаан, гацсан үед</p>
            <p><strong>Start/Stop Scanner:</strong> Signal ирэхгүй үед</p>
            <p><strong>Refresh Cache:</strong> Data хуучирсан үед</p>
            <p><strong>Clear Queue:</strong> Simulator job гацсан үед</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
