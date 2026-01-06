"use client"

import { useState, useEffect } from "react"
import { Play, Square, Zap, Activity, FileText } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { useRouter } from "next/navigation"
import { useAuthGuard } from "@/lib/auth-guard"

export default function AdminPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [health, setHealth] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && !user?.is_admin) {
      router.push("/dashboard")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    loadHealth()
    loadLogs()
  }, [])

  const loadHealth = async () => {
    try {
      const data = await api.health()
      setHealth(data)
    } catch (err: any) {
      console.error("[v0] Failed to load health:", err)
    }
  }

  const loadLogs = async () => {
    try {
      const data = await api.logs()
      setLogs(data)
    } catch (err: any) {
      console.error("[v0] Failed to load logs:", err)
    }
  }

  const handleManualScan = async () => {
    setLoadingAction("manual-scan")
    try {
      await api.manualScan()
      toast({
        title: "Амжилттай",
        description: "Manual scan эхэллээ",
      })
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Manual scan эхлүүлэх үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleStartScan = async () => {
    setLoadingAction("start-scan")
    try {
      await api.startScan()
      toast({
        title: "Амжилттай",
        description: "Scan эхэллээ",
      })
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Scan эхлүүлэх үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleStopScan = async () => {
    setLoadingAction("stop-scan")
    try {
      await api.stopScan()
      toast({
        title: "Амжилттай",
        description: "Scan зогслоо",
      })
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Scan зогсоох үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!user?.is_admin) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">System удирдлагын хэсэг</p>
        </div>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Manual Scan
              </CardTitle>
              <CardDescription>Нэг удаагийн manual scan ажиллуулах</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleManualScan} disabled={loadingAction === "manual-scan"} className="w-full">
                {loadingAction === "manual-scan" ? "Ачааллаж байна..." : "Manual Scan"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Start Scan
              </CardTitle>
              <CardDescription>Автомат scan эхлүүлэх</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={loadingAction === "start-scan"}>
                    Start Scan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Scan эхлүүлэх үү?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Энэ үйлдэл автомат scan процессийг эхлүүлнэ. Итгэлтэй байна уу?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Болих</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartScan}>Тийм</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Stop Scan
              </CardTitle>
              <CardDescription>Автомат scan зогсоох</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={loadingAction === "stop-scan"}>
                    Stop Scan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Scan зогсоох уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Энэ үйлдэл автомат scan процессийг зогсооно. Итгэлтэй байна уу?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Болих</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStopScan}>Тийм</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-xs">
                {JSON.stringify(health, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Health өгөгдөл ачаалж чадсангүй</p>
            )}
          </CardContent>
        </Card>

        {/* Logs Viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logs Viewer
            </CardTitle>
            <CardDescription>Сүүлийн 100 log мөр</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-lg bg-muted/50 p-4">
              {logs.length > 0 ? (
                <pre className="text-xs">{logs.join("\n")}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">Log олдсонгүй</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
