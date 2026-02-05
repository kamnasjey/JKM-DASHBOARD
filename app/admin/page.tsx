"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Activity, Users, Check, X, Calendar, Plus, Trash2, ExternalLink, Server, RefreshCw, Wifi, WifiOff, Clock, AlertTriangle, MessageCircle, Send, ChevronDown } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAuthGuard } from "@/lib/auth-guard"
import { useSession } from "next-auth/react"
import Link from "next/link"

type ManualPaymentRequest = {
  id: string
  email: string | null
  name: string | null
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

type SystemStatus = {
  scanner: {
    running: boolean
    lastScanTs: number
    health: "healthy" | "warning" | "critical" | "unknown"
    reachable: boolean
  }
  backend: {
    ok: boolean
    uptime_s?: number
    symbols_count?: number
  }
}

type SupportMessage = {
  id: string
  sender: "user" | "admin"
  senderName: string
  content: string
  createdAt: string
}

type SupportTicket = {
  id: string
  userId: string
  userEmail: string
  userName: string
  status: "open" | "replied" | "closed"
  subject: string
  messages: SupportMessage[]
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [isOwner, setIsOwner] = useState(false)
  const [ownerLoading, setOwnerLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const [manualRequests, setManualRequests] = useState<ManualPaymentRequest[]>([])
  const [manualGrantEmail, setManualGrantEmail] = useState("")
  const [manualGrantPlan, setManualGrantPlan] = useState<string>("starter")
  const [manualGrantNote, setManualGrantNote] = useState("")

  // Users list
  const [users, setUsers] = useState<UserInfo[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Forex Holidays
  const [forexHolidays, setForexHolidays] = useState<ForexHoliday[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [newHolidayName, setNewHolidayName] = useState("")

  // System Status
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportFilter, setSupportFilter] = useState<"all" | "open" | "replied" | "closed">("all")
  const [openTicketsCount, setOpenTicketsCount] = useState(0)
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    loadSystemStatus()
    loadManualRequests()
    loadUsers()
    loadForexHolidays()
    loadSupportTickets()
  }, [])

  // Load system status
  const loadSystemStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      // Fetch scanner status
      const scannerRes = await fetch("/api/admin/scanner/status", { cache: "no-store" })
      const scannerData = await scannerRes.json()

      // Fetch backend health
      const healthRes = await fetch("/api/proxy/health", { cache: "no-store" })
      const healthData = await healthRes.json()

      setSystemStatus({
        scanner: {
          running: scannerData.running ?? false,
          lastScanTs: scannerData.lastScanTs ?? 0,
          health: scannerData.health ?? "unknown",
          reachable: scannerData.reachable ?? false,
        },
        backend: {
          ok: healthData.ok ?? false,
          uptime_s: healthData.uptime_s,
          symbols_count: healthData.cache?.symbols,
        },
      })
    } catch (err) {
      console.error("[admin] loadSystemStatus failed:", err)
    } finally {
      setStatusLoading(false)
    }
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

  // Support Tickets functions
  const loadSupportTickets = useCallback(async () => {
    setSupportLoading(true)
    try {
      const status = supportFilter === "all" ? "" : `?status=${supportFilter}`
      const res = await fetch(`/api/admin/support${status}`, { cache: "no-store" })
      const data = await res.json()
      if (data.ok) {
        setSupportTickets(data.tickets || [])
        setOpenTicketsCount(data.openCount || 0)
      }
    } catch (err) {
      console.error("[admin] loadSupportTickets failed:", err)
    } finally {
      setSupportLoading(false)
    }
  }, [supportFilter])

  useEffect(() => {
    if (isOwner) {
      loadSupportTickets()
    }
  }, [supportFilter, isOwner, loadSupportTickets])

  const handleReplyToTicket = async (ticketId: string) => {
    if (!replyText.trim()) return
    setLoadingAction(`reply-${ticketId}`)
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId,
          message: replyText,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setReplyText("")
        toast({ title: "Амжилттай", description: "Хариу илгээгдлээ" })
        await loadSupportTickets()
      } else {
        throw new Error(data.error || "Failed to reply")
      }
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Хариу илгээхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const updateTicketStatus = async (ticketId: string, status: "open" | "replied" | "closed") => {
    setLoadingAction(`status-${ticketId}`)
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          ticketId,
          status,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: "Амжилттай", description: "Төлөв шинэчлэгдлээ" })
        await loadSupportTickets()
      } else {
        throw new Error(data.error || "Failed to update status")
      }
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Төлөв шинэчлэхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Хүлээгдэж буй</Badge>
      case "replied":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Хариу илгээсэн</Badge>
      case "closed":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Хаагдсан</Badge>
      default:
        return null
    }
  }

  const formatTicketTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "Одоо"
    if (mins < 60) return `${mins}м өмнө`
    if (hours < 24) return `${hours}ц өмнө`
    if (days < 7) return `${days}өдөр өмнө`
    return date.toLocaleDateString("mn-MN")
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

  const deleteUser = async (userId: string, userEmail: string | null) => {
    setLoadingAction(`delete-${userId}`)
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete user")
      toast({
        title: "Амжилттай",
        description: `${userEmail || userId} устгагдлаа`,
      })
      await loadUsers()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Хэрэглэгч устгахад алдаа гарлаа",
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

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "—"
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}ц ${mins}м`
    return `${mins}м`
  }

  const formatLastScan = (ts: number) => {
    if (!ts) return "—"
    const now = Math.floor(Date.now() / 1000)
    const secs = now - ts
    if (secs < 60) return `${secs}с өмнө`
    if (secs < 3600) return `${Math.floor(secs / 60)}м өмнө`
    return `${Math.floor(secs / 3600)}ц өмнө`
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">System удирдлагын хэсэг</p>
          </div>
          <Link href="/repair">
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Засварын газар
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Системийн төлөв
              </span>
              <Button variant="ghost" size="sm" onClick={loadSystemStatus} disabled={statusLoading}>
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Scanner Status */}
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Activity className="h-3 w-3" /> Scanner
                </div>
                <div className={`text-lg font-semibold ${systemStatus?.scanner.running ? "text-emerald-600" : "text-red-600"}`}>
                  {systemStatus?.scanner.running ? "Ажиллаж байна" : "Зогссон"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStatus?.scanner.health === "healthy" && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Хэвийн</Badge>}
                  {systemStatus?.scanner.health === "warning" && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Анхааруулга</Badge>}
                  {systemStatus?.scanner.health === "critical" && <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Асуудалтай</Badge>}
                </div>
              </div>

              {/* Last Scan */}
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Clock className="h-3 w-3" /> Сүүлийн scan
                </div>
                <div className="text-lg font-semibold">
                  {formatLastScan(systemStatus?.scanner.lastScanTs || 0)}
                </div>
              </div>

              {/* Backend */}
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  {systemStatus?.backend.ok ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} Backend
                </div>
                <div className={`text-lg font-semibold ${systemStatus?.backend.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {systemStatus?.backend.ok ? "OK" : "Алдаа"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Uptime: {formatUptime(systemStatus?.backend.uptime_s)}
                </div>
              </div>

              {/* Symbols */}
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Activity className="h-3 w-3" /> Cache
                </div>
                <div className="text-lg font-semibold">
                  {systemStatus?.backend.symbols_count ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">symbols</div>
              </div>
            </div>

            {/* Quick link to Repair */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Scanner удирдлага, дэлгэрэнгүй оношлогоо
              </div>
              <Link href="/repair">
                <Button variant="outline" size="sm">
                  Засварын газар руу очих →
                </Button>
              </Link>
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
                    <div className="flex items-center gap-2">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={loadingAction === `delete-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Хэрэглэгч устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{user.email || user.name}</strong> хэрэглэгчийн бүх өгөгдөл устгагдана.
                              Энэ үйлдлийг буцаах боломжгүй!
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Болих</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.id, user.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Устгах
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                  <div key={r.id} className="rounded-lg border p-4 bg-yellow-500/5 border-yellow-500/20">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.name || r.email || r.id}</span>
                          <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
                            {r.manualPaymentPlan === "pro_plus" ? "Pro+" : "Pro"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{r.email}</div>
                        <div className="grid gap-1 text-xs">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Төлбөр төлсөн:</span>
                            <span>{r.manualPaymentPayerEmail || "—"}</span>
                          </div>
                          {r.manualPaymentTxnRef && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Гүйлгээний дугаар:</span>
                              <span className="font-mono">{r.manualPaymentTxnRef}</span>
                            </div>
                          )}
                          {r.manualPaymentNote && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Тэмдэглэл:</span>
                              <span>{r.manualPaymentNote}</span>
                            </div>
                          )}
                          {r.manualPaymentRequestedAt && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Хүсэлт илгээсэн:</span>
                              <span>{new Date(r.manualPaymentRequestedAt).toLocaleString("mn-MN")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => decideManual(r, "approve")}
                          disabled={loadingAction === `manual-approve-${r.id}`}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {loadingAction === `manual-approve-${r.id}` ? "..." : "Зөвшөөрөх"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => decideManual(r, "reject")}
                          disabled={loadingAction === `manual-reject-${r.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {loadingAction === `manual-reject-${r.id}` ? "..." : "Татгалзах"}
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
                      <SelectItem value="starter">Starter</SelectItem>
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

        {/* Support Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Хэрэглэгчийн хүсэлтүүд
              {openTicketsCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">{openTicketsCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Хэрэглэгчдийн санал, хүсэлт, асуултууд
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter and refresh */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Select value={supportFilter} onValueChange={(v) => setSupportFilter(v as typeof supportFilter)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    <SelectItem value="open">Хүлээгдэж буй</SelectItem>
                    <SelectItem value="replied">Хариу илгээсэн</SelectItem>
                    <SelectItem value="closed">Хаагдсан</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={loadSupportTickets} disabled={supportLoading}>
                  <RefreshCw className={`h-4 w-4 ${supportLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Нийт: {supportTickets.length} хүсэлт
              </div>
            </div>

            {/* Tickets list */}
            {supportLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Ачааллаж байна...</p>
            ) : supportTickets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {supportFilter === "all" ? "Хүсэлт байхгүй" : "Энэ төлөвтэй хүсэлт байхгүй"}
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {supportTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`rounded-lg border transition-all ${
                      ticket.status === "open"
                        ? "bg-yellow-500/5 border-yellow-500/30"
                        : ticket.status === "replied"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30"
                    }`}
                  >
                    {/* Ticket header - always visible */}
                    <button
                      onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{ticket.subject}</span>
                            {getTicketStatusBadge(ticket.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {ticket.userName?.charAt(0) || ticket.userEmail?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{ticket.userName || ticket.userEmail}</span>
                            <span>•</span>
                            <span>{formatTicketTime(ticket.updatedAt)}</span>
                            <span>•</span>
                            <span>{ticket.messages.length} мессеж</span>
                          </div>
                          {/* Preview of last message */}
                          <p className="text-sm text-muted-foreground mt-2 truncate">
                            {ticket.messages[ticket.messages.length - 1]?.content}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            expandedTicketId === ticket.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded content */}
                    {expandedTicketId === ticket.id && (
                      <div className="border-t px-4 pb-4">
                        {/* Messages */}
                        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
                          {ticket.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  msg.sender === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    msg.sender === "admin" ? "opacity-70" : "text-muted-foreground"
                                  }`}
                                >
                                  {msg.senderName} • {formatTicketTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Reply form and actions */}
                        {ticket.status !== "closed" && (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Хариу бичих..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleReplyToTicket(ticket.id)}
                                disabled={loadingAction === `reply-${ticket.id}` || !replyText.trim()}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {loadingAction === `reply-${ticket.id}` ? "..." : "Илгээх"}
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateTicketStatus(ticket.id, "closed")}
                                disabled={loadingAction === `status-${ticket.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Хаах
                              </Button>
                              {ticket.status === "replied" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateTicketStatus(ticket.id, "open")}
                                  disabled={loadingAction === `status-${ticket.id}`}
                                >
                                  Дахин нээх
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {ticket.status === "closed" && (
                          <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-muted-foreground">Энэ хүсэлт хаагдсан</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateTicketStatus(ticket.id, "open")}
                              disabled={loadingAction === `status-${ticket.id}`}
                            >
                              Дахин нээх
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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
