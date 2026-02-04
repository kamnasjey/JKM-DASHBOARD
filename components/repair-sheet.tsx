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
      <SheetContent side="right" className="w-full sm:max-w-[800px] lg:max-w-[900px] overflow-y-auto p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="size-10 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center text-primary">
                <RefreshCw className="h-5 w-5" />
              </div>
              Засварын газар
            </SheetTitle>
            <SheetDescription className="mt-1">
              Системийн статус шалгах, түргэн засвар хийх
            </SheetDescription>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Status Cards - 4 columns on large screens */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Системийн статус</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { checkHealth(); testWebSocket() }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Дахин шалгах
                </Button>
              </div>

              {/* Status explanation */}
              <div className="text-xs text-muted-foreground bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="font-medium text-blue-600 mb-1">💡 Статус гэж юу вэ?</p>
                <p>Эдгээр нь системийн үндсэн хэсгүүд зөв ажиллаж байгаа эсэхийг харуулна. Бүгд <span className="text-green-600 font-medium">ногоон</span> бол систем хэвийн ажиллаж байна.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Backend Status */}
                <Card className={health?.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Server className="h-4 w-4" />
                      Backend
                    </div>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : health?.ok ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-semibold text-green-600">OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-lg font-semibold text-red-600">Алдаа</span>
                      </div>
                    )}
                    {health?.uptime_s && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Uptime: {formatUptime(health.uptime_s)}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">Үндсэн сервер</p>
                  </CardContent>
                </Card>

                {/* WebSocket Status */}
                <Card className={wsStatus.connected ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {wsStatus.connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                      WebSocket
                    </div>
                    {wsStatus.connected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-semibold text-green-600">Холбогдсон</span>
                      </div>
                    ) : wsStatus.tested ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-semibold text-yellow-600">Салсан</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Шалгаж байна...</span>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">Live signal холболт</p>
                  </CardContent>
                </Card>

                {/* Cache Status */}
                <Card className={health?.cache_ready ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-2">Cache</div>
                    {health?.cache_ready ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-semibold">{health.symbols_count} symbols</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-semibold text-yellow-600">Бэлэн биш</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">Үнийн мэдээлэл</p>
                  </CardContent>
                </Card>

                {/* Simulator Queue */}
                <Card className={(health?.sim_queue_size ?? 0) > 3 ? "border-yellow-500/30 bg-yellow-500/5" : "border-muted"}>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-2">Sim Queue</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-bold">{health?.sim_queue_size ?? "—"}</span>
                      <span className="text-sm text-muted-foreground">jobs</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Хүлээж буй simulation</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions - Larger buttons in grid */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Түргэн засвар</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Restart Backend - Main action */}
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold flex items-center gap-2 text-base">
                        <RotateCcw className="h-5 w-5" />
                        Backend Restart
                      </h4>
                      <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30">
                        Хүчтэй засвар
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Хэзээ хэрэглэх:</strong> Систем бүхэлдээ удааширсан, хариу өгөхгүй болсон үед
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                        <p>• Simulator 5+ минут болж байгаа бол</p>
                        <p>• Backend статус "Алдаа" гэж харагдаж байвал</p>
                        <p>• Юу ч ажиллахгүй байвал энийг дар</p>
                      </div>
                      <p className="text-xs text-yellow-600">
                        ⚠️ Restart дарсны дараа 10-15 секунд хүлээнэ үү
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={restartBackend}
                      disabled={actionLoading === "restart"}
                    >
                      {actionLoading === "restart" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Restart хийх
                    </Button>
                  </CardContent>
                </Card>

                {/* Scanner Controls */}
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold flex items-center gap-2 text-base mb-2">
                      <Play className="h-5 w-5" />
                      Scanner удирдлага
                    </h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Хэзээ хэрэглэх:</strong> Dashboard дээр шинэ signal ирэхгүй болсон үед
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                        <p>• Dashboard-д signal шинэчлэгдэхгүй бол</p>
                        <p>• "Engine: Stopped" гэж харагдаж байвал</p>
                        <p>• Эхлээд Stop дараад дахин Start дарна</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={startScanner}
                        disabled={actionLoading === "start-scanner"}
                        className="border-green-500/30 hover:bg-green-500/10"
                      >
                        {actionLoading === "start-scanner" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        Start
                      </Button>
                      <Button
                        variant="outline"
                        onClick={stopScanner}
                        disabled={actionLoading === "stop-scanner"}
                        className="border-red-500/30 hover:bg-red-500/10"
                      >
                        {actionLoading === "stop-scanner" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4 mr-2 text-red-500" />
                        )}
                        Stop
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Refresh Cache */}
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold flex items-center gap-2 text-base mb-2">
                      <RefreshCw className="h-5 w-5" />
                      Cache Refresh
                    </h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Хэзээ хэрэглэх:</strong> Үнийн мэдээлэл хуучин эсвэл буруу харагдаж байвал
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                        <p>• Symbol-ийн үнэ шинэчлэгдэхгүй бол</p>
                        <p>• "Last M5: 10+ мин ago" гэж харагдаж байвал</p>
                        <p>• Зах хаагдсаны дараа нээгдэхэд</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={refreshCache}
                      disabled={actionLoading === "refresh-cache"}
                    >
                      {actionLoading === "refresh-cache" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh хийх
                    </Button>
                  </CardContent>
                </Card>

                {/* Clear Queue */}
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold flex items-center gap-2 text-base mb-2">
                      <Trash2 className="h-5 w-5" />
                      Queue цэвэрлэх
                    </h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Хэзээ хэрэглэх:</strong> Simulator дараалалд олон job хуримтлагдсан үед
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                        <p>• Sim Queue дээр олон job (5+) харагдаж байвал</p>
                        <p>• Simulator эхлэхгүй, хүлээж байна гэж байвал</p>
                        <p>• Өмнөх simulation-ууд гацсан бол</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={clearSimQueue}
                      disabled={actionLoading === "clear-queue" || (health?.sim_queue_size ?? 0) === 0}
                    >
                      {actionLoading === "clear-queue" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear Queue ({health?.sim_queue_size ?? 0} jobs)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
