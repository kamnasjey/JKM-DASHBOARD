"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Activity,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Server
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScannerStatus {
  ok: boolean
  reachable: boolean
  running: boolean
  lastScanTs: number
  lastScanId: string | null
  cadenceSec: number
  lastError: string | null
  secsSinceLastScan: number | null
  health: "healthy" | "warning" | "critical" | "unknown"
  checkedAt: number
  error?: string
}

function formatTimeAgo(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "Мэдэгдэхгүй"
  if (seconds < 60) return `${seconds} секундын өмнө`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} минутын өмнө`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} цагийн өмнө`
  return `${Math.floor(seconds / 86400)} өдрийн өмнө`
}

function formatTime(ts: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function ScannerMonitorPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [controlling, setControlling] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scanner/status", { cache: "no-store" })
      const data = await res.json()
      setScannerStatus(data)
      setLastRefresh(new Date())
    } catch (err) {
      setScannerStatus({
        ok: false,
        reachable: false,
        running: false,
        lastScanTs: 0,
        lastScanId: null,
        cadenceSec: 300,
        lastError: "Failed to fetch status",
        secsSinceLastScan: null,
        health: "critical",
        checkedAt: Math.floor(Date.now() / 1000),
        error: "Network error",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchStatus()
    }
  }, [sessionStatus, fetchStatus])

  // Auto refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh || sessionStatus !== "authenticated") return
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, sessionStatus, fetchStatus])

  const handleControl = async (action: "start" | "stop" | "restart") => {
    setControlling(true)
    try {
      const res = await fetch("/api/admin/scanner/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.ok) {
        // Wait a bit then refresh status
        setTimeout(fetchStatus, 2000)
      } else {
        alert(`Failed: ${data.error || data.message}`)
      }
    } catch (err) {
      alert("Network error")
    } finally {
      setControlling(false)
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Нэвтрэх шаардлагатай</p>
      </div>
    )
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy": return "text-green-400"
      case "warning": return "text-yellow-400"
      case "critical": return "text-red-400"
      default: return "text-gray-400"
    }
  }

  const getHealthBg = (health: string) => {
    switch (health) {
      case "healthy": return "bg-green-400/10 border-green-400/30"
      case "warning": return "bg-yellow-400/10 border-yellow-400/30"
      case "critical": return "bg-red-400/10 border-red-400/30"
      default: return "bg-gray-400/10 border-gray-400/30"
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy": return <CheckCircle className="w-8 h-8 text-green-400" />
      case "warning": return <AlertTriangle className="w-8 h-8 text-yellow-400" />
      case "critical": return <XCircle className="w-8 h-8 text-red-400" />
      default: return <Activity className="w-8 h-8 text-gray-400" />
    }
  }

  const getHealthText = (health: string) => {
    switch (health) {
      case "healthy": return "Хэвийн ажиллаж байна"
      case "warning": return "Анхааруулга - Удааширсан"
      case "critical": return "Асуудалтай - Шалгах хэрэгтэй"
      default: return "Төлөв тодорхойгүй"
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Server className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Scanner Monitor</h1>
            <p className="text-sm text-gray-500">Real-time scanner status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Status Card */}
      {scannerStatus && (
        <div className={`p-6 rounded-xl border ${getHealthBg(scannerStatus.health)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getHealthIcon(scannerStatus.health)}
              <div>
                <h2 className={`text-xl font-bold ${getHealthColor(scannerStatus.health)}`}>
                  {getHealthText(scannerStatus.health)}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {scannerStatus.reachable ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> Backend холбогдсон
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400">
                      <WifiOff className="w-3 h-3" /> Backend холбогдохгүй байна
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              {scannerStatus.running ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleControl("stop")}
                    disabled={controlling}
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleControl("restart")}
                    disabled={controlling}
                    className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControl("start")}
                  disabled={controlling}
                  className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      {scannerStatus && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Running Status */}
          <div className="p-4 rounded-xl bg-[#111] border border-white/10">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Төлөв
            </div>
            <div className={`text-lg font-bold ${scannerStatus.running ? "text-green-400" : "text-red-400"}`}>
              {scannerStatus.running ? "Ажиллаж байна" : "Зогссон"}
            </div>
          </div>

          {/* Last Scan */}
          <div className="p-4 rounded-xl bg-[#111] border border-white/10">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Сүүлийн scan
            </div>
            <div className="text-lg font-bold">
              {formatTimeAgo(scannerStatus.secsSinceLastScan)}
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(scannerStatus.lastScanTs)}
            </div>
          </div>

          {/* Cadence */}
          <div className="p-4 rounded-xl bg-[#111] border border-white/10">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Scan давтамж
            </div>
            <div className="text-lg font-bold">
              {Math.floor(scannerStatus.cadenceSec / 60)} минут
            </div>
            <div className="text-xs text-gray-500">
              ({scannerStatus.cadenceSec} секунд)
            </div>
          </div>

          {/* Last Check */}
          <div className="p-4 rounded-xl bg-[#111] border border-white/10">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Сүүлд шалгасан
            </div>
            <div className="text-lg font-bold">
              {lastRefresh?.toLocaleTimeString("mn-MN") || "—"}
            </div>
            <div className="text-xs text-gray-500">
              {autoRefresh ? "5 секунд тутамд" : "Гараар"}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {scannerStatus?.lastError && (
        <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-400">Сүүлийн алдаа</h3>
              <p className="text-sm text-gray-300 mt-1 font-mono">
                {scannerStatus.lastError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Scan ID */}
      {scannerStatus?.lastScanId && (
        <div className="p-4 rounded-xl bg-[#111] border border-white/10">
          <div className="text-xs text-gray-500 mb-1">Сүүлийн Scan ID</div>
          <div className="text-sm font-mono text-gray-300">
            {scannerStatus.lastScanId}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !scannerStatus && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  )
}
