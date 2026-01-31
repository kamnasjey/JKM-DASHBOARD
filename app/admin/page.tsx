"use client"

import { useState, useEffect } from "react"
import { Play, Square, Zap, Activity, FileText, Users, Check, X, Calendar, Plus, Trash2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

type UserInfo = {
  id: string
  email: string | null
  name: string | null
  image: string | null
  provider: string
  hasPaidAccess: boolean
  createdAt: string
}

type ForexHoliday = {
  date: string
  name: string
  added_by?: string
  added_at?: string
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
  
  // Users list
  const [users, setUsers] = useState<UserInfo[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Forex Holidays
  const [forexHolidays, setForexHolidays] = useState<ForexHoliday[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [newHolidayName, setNewHolidayName] = useState("")

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
    loadUsers()
    loadForexHolidays()
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setUsers(data?.users ?? [])
    } catch (err) {
      console.error("[admin] loadUsers failed:", err)
    } finally {
      setUsersLoading(false)
    }
  }

  // Forex Holidays functions
  const loadForexHolidays = async () => {
    setHolidaysLoading(true)
    try {
      const res = await fetch("/api/admin/forex-holidays", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setForexHolidays(data?.holidays ?? [])
    } catch (err) {
      console.error("[admin] loadForexHolidays failed:", err)
    } finally {
      setHolidaysLoading(false)
    }
  }

  const addForexHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast({
        title: "Алдаа",
        description: "Огноо болон нэр оруулна уу",
        variant: "destructive",
      })
      return
    }

    setLoadingAction("add-holiday")
    try {
      const res = await fetch("/api/admin/forex-holidays", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: newHolidayDate, name: newHolidayName }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.message || "Failed to add holiday")
      }
      toast({ title: "Амжилттай", description: `Holiday нэмэгдлээ: ${newHolidayDate}` })
      setNewHolidayDate("")
      setNewHolidayName("")
      await loadForexHolidays()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Holiday нэмэхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const removeForexHoliday = async (date: string) => {
    setLoadingAction(`remove-holiday-${date}`)
    try {
      const res = await fetch(`/api/admin/forex-holidays/${date}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.message || "Failed to remove holiday")
      }
      toast({ title: "Амжилттай", description: `Holiday устгагдлаа: ${date}` })
      await loadForexHolidays()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Holiday устгахад алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const toggleUserAccess = async (userId: string, currentAccess: boolean) => {
    setLoadingAction(`toggle-${userId}`)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, hasAccess: !currentAccess }),
      })
      if (!res.ok) throw new Error("Failed to update access")
      toast({
        title: "Амжилттай",
        description: currentAccess ? "Access хаагдлаа" : "Access нээгдлээ",
      })
      await loadUsers()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Access шинэчлэхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

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

        {/* Users Access Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Хэрэглэгчдийн хандалт
            </CardTitle>
            <CardDescription>
              Бүртгэлтэй хэрэглэгчид - Access зөвшөөрөх/хаах
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={usersLoading}>
                {usersLoading ? "Ачааллаж байна..." : "Шинэчлэх"}
              </Button>
              <div className="text-sm text-muted-foreground">
                Нийт: {users.length} | Access-тэй: {users.filter(u => u.hasPaidAccess).length}
              </div>
            </div>

            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Хэрэглэгч байхгүй</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.hasPaidAccess ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user.name || "—"}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.provider}
                          </Badge>
                          {user.hasPaidAccess && (
                            <Badge className="bg-green-500 text-xs">Access</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Бүртгүүлсэн: {new Date(user.createdAt).toLocaleDateString("mn-MN")}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={user.hasPaidAccess ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleUserAccess(user.id, user.hasPaidAccess)}
                      disabled={loadingAction === `toggle-${user.id}`}
                    >
                      {loadingAction === `toggle-${user.id}` ? (
                        "..."
                      ) : user.hasPaidAccess ? (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Хаах
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Нээх
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

        {/* Forex Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Forex Holidays
            </CardTitle>
            <CardDescription>
              Forex market-ийн баярын өдрүүд. Эдгээр өдрүүдэд Data Ingestor Forex символуудын data татахгүй.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new holiday */}
            <div className="flex flex-wrap gap-3 items-end p-3 rounded-md border bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs">Огноо</Label>
                <Input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[150px]">
                <Label className="text-xs">Баярын нэр</Label>
                <Input
                  placeholder="Christmas, New Year..."
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                />
              </div>
              <Button
                onClick={addForexHoliday}
                disabled={loadingAction === "add-holiday" || !newHolidayDate || !newHolidayName.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                {loadingAction === "add-holiday" ? "..." : "Нэмэх"}
              </Button>
            </div>

            {/* Holidays list */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={loadForexHolidays} disabled={holidaysLoading}>
                {holidaysLoading ? "Ачааллаж байна..." : "Шинэчлэх"}
              </Button>
              <div className="text-sm text-muted-foreground">
                Нийт: {forexHolidays.length} holiday
              </div>
            </div>

            {forexHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Holiday байхгүй</p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {forexHolidays.map((holiday) => (
                  <div
                    key={holiday.date}
                    className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {holiday.date}
                      </Badge>
                      <span className="text-sm">{holiday.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeForexHoliday(holiday.date)}
                      disabled={loadingAction === `remove-holiday-${holiday.date}`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
