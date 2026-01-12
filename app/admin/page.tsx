"use client"

import { useState, useEffect } from "react"
import { Play, Square, Zap, Activity, FileText } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useRouter } from "next/navigation"
import { useAuthGuard } from "@/lib/auth-guard"
import { useSession } from "next-auth/react"

type ManualPaymentRequest = {
  id: string
  email: string | null
  manualPaymentPlan: string | null
  manualPaymentPayerEmail: string | null
  manualPaymentTxnRef: string | null
  manualPaymentNote: string | null
  manualPaymentRequestedAt: string | null
}

export default function AdminPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [isOwner, setIsOwner] = useState(false)
  const [ownerLoading, setOwnerLoading] = useState(true)
  const [health, setHealth] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const [manualRequests, setManualRequests] = useState<ManualPaymentRequest[]>([])
  const [manualGrantEmail, setManualGrantEmail] = useState("")
  const [manualGrantPlan, setManualGrantPlan] = useState<string>("pro")
  const [manualGrantNote, setManualGrantNote] = useState("")

  useEffect(() => {
    let mounted = true
    setOwnerLoading(true)
    fetch("/api/owner/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        setIsOwner(Boolean(d?.isOwner))
      })
      .catch(() => {
        if (!mounted) return
        setIsOwner(false)
      })
      .finally(() => {
        if (!mounted) return
        setOwnerLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "loading" || ownerLoading) return
    if (!isOwner) router.push("/dashboard")
  }, [isOwner, ownerLoading, router, sessionStatus])

  useEffect(() => {
    loadHealth()
    loadLogs()
    loadManualRequests()
  }, [])

  const loadManualRequests = async () => {
    try {
      const res = await fetch("/api/admin/manual-payments/list", { cache: "no-store" })
      if (!res.ok) {
        return
      }
      const data = await res.json()
      setManualRequests((data?.requests ?? []) as ManualPaymentRequest[])
    } catch (err) {
      console.error("[admin] loadManualRequests failed:", err)
    }
  }

  const decideManual = async (req: ManualPaymentRequest, decision: "approve" | "reject") => {
    setLoadingAction(`manual-${decision}-${req.id}`)
    try {
      const res = await fetch("/api/admin/manual-payments/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: req.id,
          decision,
          plan: req.manualPaymentPlan ?? undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message ?? "Action failed")
      }
      toast({
        title: "Амжилттай",
        description: decision === "approve" ? "Access нээгдлээ" : "Хүсэлт татгалзлаа",
      })
      await loadManualRequests()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Action үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const grantByEmail = async () => {
    setLoadingAction("manual-grant")
    try {
      const res = await fetch("/api/admin/manual-payments/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userEmail: manualGrantEmail,
          decision: "approve",
          plan: manualGrantPlan,
          note: manualGrantNote,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message ?? "Grant failed")
      }
      toast({ title: "Амжилттай", description: "User-д access нээлээ" })
      setManualGrantEmail("")
      setManualGrantNote("")
      await loadManualRequests()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Grant үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

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

  if (sessionStatus === "loading" || ownerLoading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!isOwner) return null

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

        {/* Manual Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Payments</CardTitle>
            <CardDescription>Дансаар шилжүүлэлтийн хүсэлтүүд (pending)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={loadManualRequests}>
                Шинэчлэх
              </Button>
              <div className="text-xs text-muted-foreground">Нийт: {manualRequests.length}</div>
            </div>

            {manualRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pending хүсэлт алга.</p>
            ) : (
              <div className="space-y-3">
                {manualRequests.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{r.email ?? r.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Plan: {r.manualPaymentPlan ?? "—"} | Payer: {r.manualPaymentPayerEmail ?? "—"}
                        </div>
                        {r.manualPaymentTxnRef && (
                          <div className="text-xs text-muted-foreground">TxnRef: {r.manualPaymentTxnRef}</div>
                        )}
                        {r.manualPaymentNote && (
                          <div className="text-xs text-muted-foreground">Note: {r.manualPaymentNote}</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => decideManual(r, "approve")}
                          disabled={loadingAction === `manual-approve-${r.id}`}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => decideManual(r, "reject")}
                          disabled={loadingAction === `manual-reject-${r.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">Grant access (manual) by email</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label>User email</Label>
                  <Input
                    placeholder="user@gmail.com"
                    value={manualGrantEmail}
                    onChange={(e) => setManualGrantEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Plan</Label>
                  <Select value={manualGrantPlan} onValueChange={setManualGrantPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="pro_plus">Pro+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Admin note (optional)</Label>
                  <Input value={manualGrantNote} onChange={(e) => setManualGrantNote(e.target.value)} />
                </div>
              </div>

              <div className="mt-3">
                <Button onClick={grantByEmail} disabled={loadingAction === "manual-grant" || !manualGrantEmail.trim()}>
                  {loadingAction === "manual-grant" ? "Ачааллаж байна..." : "Grant"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
