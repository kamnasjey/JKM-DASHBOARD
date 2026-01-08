"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Clock, TrendingUp, Activity, CheckCircle2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [signals, setSignals] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [nextScan, setNextScan] = useState(300) // 5 minutes in seconds
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      setNextScan((prev) => (prev > 0 ? prev - 1 : 300))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [metricsData, signalsData, healthData] = await Promise.all([
        api.getMetrics(),
        api.getSignals({ limit: 10 }),
        api.getHealth(),
      ])
      setMetrics(metricsData)
      setSignals(signalsData)
      setHealth(healthData)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: error.message,
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString("mn-MN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Таны Setup-уудын үйл ажиллагаа</p>
      </div>

      {/* Scan Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сүүлийн Scan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.last_scan_time ? formatTimestamp(metrics.last_scan_time) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Scan хийсэн цаг</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Дараагийн Scan</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatTime(nextScan)}</div>
            <p className="text-xs text-muted-foreground">Хугацаа үлдсэн</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Идэвхтэй Setup</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_setups || 0}</div>
            <p className="text-xs text-muted-foreground">Scan хийж байгаа</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Өнөөдрийн SETUP FOUND</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Олдсон setup</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Findings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Сүүлийн илэрцүүд</CardTitle>
            <CardDescription>Сүүлд олдсон setup-ууд</CardDescription>
          </CardHeader>
          <CardContent>
            {signals.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Одоогоор setup олдоогүй байна</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Setup нэр</TableHead>
                    <TableHead>Цаг</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => (
                    <TableRow key={signal.signal_id}>
                      <TableCell className="font-medium">{signal.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{signal.market || "FX"}</Badge>
                      </TableCell>
                      <TableCell>{signal.setup_name || "Default Setup"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimestamp(signal.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">FOUND</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Button variant="outline" asChild className="w-full bg-transparent">
                <Link href="/app/signals">Бүх илэрцүүдийг үзэх</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Системийн төлөв байдал</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Backend Status</span>
              <Badge variant={health?.status === "ok" ? "default" : "destructive"}>
                {health?.status === "ok" ? "OK" : "ERROR"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Latency</span>
              <span className="text-sm text-muted-foreground">~50ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cache Size</span>
              <span className="text-sm text-muted-foreground">24.5 MB</span>
            </div>
            <div className="pt-4">
              <Button variant="outline" size="sm" onClick={loadData} className="w-full bg-transparent">
                <Activity className="mr-2 h-4 w-4" />
                Шинэчлэх
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
