"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Play, Square, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { SignalsDrawer } from "@/components/signals-drawer"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [backfillStatus, setBackfillStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [signals, setSignals] = useState<any[]>([])
  const [selectedSignal, setSelectedSignal] = useState<any>(null)

  useEffect(() => {
    if (status === "authenticated") {
      fetchEngineStatus()
      fetchBackfillStatus()
      fetchSignals()
      const interval = setInterval(() => {
        fetchEngineStatus()
        fetchBackfillStatus()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [status])

  const fetchEngineStatus = async () => {
    try {
      const res = await fetch("/api/proxy/engine/status")
      const data = await res.json()
      setEngineStatus(data)
    } catch (err) {
      console.error("Failed to fetch engine status:", err)
    }
  }

  const fetchBackfillStatus = async () => {
    try {
      const res = await fetch("/api/proxy/backfill/status")
      const data = await res.json()
      setBackfillStatus(data)
    } catch (err) {
      console.error("Failed to fetch backfill status:", err)
    }
  }

  const fetchSignals = async () => {
    try {
      const res = await fetch("/api/proxy/signals?limit=20")
      const data = await res.json()
      setSignals(data.signals || [])
    } catch (err) {
      console.error("Failed to fetch signals:", err)
    }
  }

  const handleStartEngine = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/proxy/engine/start", { method: "POST" })
      const result = await res.json()
      toast({ title: "Амжилттай", description: "Engine эхэллээ" })
      await fetchEngineStatus()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopEngine = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/proxy/engine/stop", { method: "POST" })
      const result = await res.json()
      toast({ title: "Амжилттай", description: "Engine зогслоо" })
      await fetchEngineStatus()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualScan = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/proxy/engine/manual-scan", { method: "POST" })
      const result = await res.json()
      toast({ title: "Амжилттай", description: "Гарын авлага скан эхэллээ" })
      await fetchEngineStatus()
      await fetchSignals()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackfillTest = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/proxy/backfill/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "EURUSD", days: 7 }),
      })
      const result = await res.json()
      toast({ title: "Амжилттай", description: "Backfill (test) эхэллээ" })
      await fetchBackfillStatus()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackfillFull = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/proxy/backfill/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "ALL", days: 730 }),
      })
      const result = await res.json()
      toast({ title: "Амжилттай", description: "Backfill (full) эхэллээ" })
      await fetchBackfillStatus()
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Ачааллаж байна...</div>
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Engine Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Engine Status</CardTitle>
            <CardDescription>Scan системийн төлөв ба удирдлага</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4">
              {engineStatus ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Төлөв:</span>
                    <span className={`font-medium ${engineStatus.running ? "text-green-500" : "text-red-500"}`}>
                      {engineStatus.running ? "Ажиллаж байна" : "Зогссон"}
                    </span>
                  </div>
                  {engineStatus.last_scan_ts && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Сүүлийн скан:</span>
                      <span className="font-mono text-xs">
                        {new Date(engineStatus.last_scan_ts).toLocaleString("mn-MN")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Уншиж байна...</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStartEngine} disabled={isLoading} size="sm">
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
              <Button onClick={handleStopEngine} disabled={isLoading} variant="outline" size="sm">
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
              <Button onClick={handleManualScan} disabled={isLoading} variant="secondary" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Manual Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backfill Card */}
        <Card>
          <CardHeader>
            <CardTitle>Түүхэн өгөгдөл татах</CardTitle>
            <CardDescription>Түүхэн price өгөгдөл болон setup шалгах</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleBackfillTest} disabled={isLoading} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                EURUSD 7 хоног татах (test)
              </Button>
              <Button onClick={handleBackfillFull} disabled={isLoading} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                15 хослол 2 жил татах
              </Button>
            </div>

            {backfillStatus && (
              <div className="space-y-2">
                <div className="rounded-md border p-3">
                  <div className="mb-1 text-sm font-medium">Backfill Status</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Төлөв:</span>
                      <span className={backfillStatus.running ? "text-yellow-500" : "text-muted-foreground"}>
                        {backfillStatus.running ? "Ажиллаж байна" : "Зогссон"}
                      </span>
                    </div>
                    {backfillStatus.progress !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Явц:</span>
                        <span className="font-mono">{backfillStatus.progress}%</span>
                      </div>
                    )}
                    {backfillStatus.current_symbol && (
                      <div className="flex items-center justify-between">
                        <span>Одоогийн хослол:</span>
                        <span className="font-mono">{backfillStatus.current_symbol}</span>
                      </div>
                    )}
                  </div>
                </div>

                {backfillStatus.log && backfillStatus.log.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">Log Output:</div>
                    <div className="max-h-32 overflow-y-auto font-mono text-xs">
                      {backfillStatus.log.map((line: string, i: number) => (
                        <div key={i} className="text-muted-foreground">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signals List */}
        <Card>
          <CardHeader>
            <CardTitle>SETUP FOUND</CardTitle>
            <CardDescription>Таны тохируулсан нөхцөлд тохирсон setup-ууд</CardDescription>
          </CardHeader>
          <CardContent>
            {signals.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Одоогоор олдсон setup байхгүй байна. Manual scan эсвэл engine-г асаагаад хүлээнэ үү.
              </div>
            ) : (
              <div className="space-y-2">
                {signals.map((signal: any) => (
                  <button
                    key={signal.id}
                    onClick={() => setSelectedSignal(signal)}
                    className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{signal.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {signal.direction} · {signal.status}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(signal.timestamp).toLocaleDateString("mn-MN")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SignalsDrawer signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </DashboardLayout>
  )
}
