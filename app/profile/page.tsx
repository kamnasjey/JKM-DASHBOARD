"use client"

import { useState, useEffect } from "react"
import { User, CheckCircle, XCircle, MessageCircle, Send } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { useSession } from "next-auth/react"

export default function ProfilePage() {
  useAuthGuard(true)

  const { data: session } = useSession()

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [profile, setProfile] = useState<any | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.profile()
      setProfile(data)
    } catch (err: any) {
      console.error("[profile] Failed to load profile:", err)
      setProfile({
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        display_name: "",
        telegram_chat_id: "",
        telegram_enabled: false,
      })
      toast({
        title: "Алдаа",
        description: "Profile ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const rawChatId = typeof profile?.telegram_chat_id === "string" ? profile.telegram_chat_id.trim() : ""
      const displayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : ""

      await api.updateUserPrefs({
        telegram_chat_id: rawChatId || null,
        telegram_enabled: Boolean(rawChatId),
        display_name: displayName || null,
      })

      // Update local state to reflect saved status
      setProfile((prev: any) => ({
        ...prev,
        telegram_enabled: Boolean(rawChatId),
      }))

      toast({
        title: "Амжилттай",
        description: rawChatId
          ? "Profile хадгалагдлаа. Telegram мэдэгдэл идэвхжлээ!"
          : "Profile хадгалагдлаа",
      })
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Хадгалах үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestTelegram = async () => {
    setTesting(true)
    try {
      const result = await api.telegramTest()
      toast({
        title: "Амжилттай",
        description: result.message || "Тест мессеж илгээгдлээ! Telegram-аа шалгана уу.",
      })
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Telegram тест илгээхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const hasTelegramId = Boolean(profile?.telegram_chat_id?.trim())
  const telegramEnabled = hasTelegramId && profile?.telegram_enabled

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Таны хувийн мэдээлэл болон тохиргоо</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Хувийн мэдээлэл
            </CardTitle>
            <CardDescription>Таны мэдээллийг засварлах</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Харагдах нэр (Display Name)</Label>
              <Input
                id="display_name"
                value={profile?.display_name || ""}
                onChange={(e) =>
                  setProfile((prev: any) => ({
                    ...(prev ?? {}),
                    display_name: e.target.value,
                  }))
                }
                placeholder="Таны нэр (UI дээр харагдана)"
              />
              <p className="text-xs text-muted-foreground">
                Dashboard дээр харагдах нэр
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Google нэр</Label>
              <Input id="name" value={profile?.name || session?.user?.name || ""} disabled />
              <p className="text-xs text-muted-foreground">Google-ээс авсан нэр (солих боломжгүй)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input id="email" value={profile?.email || session?.user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">Имэйл солих боломжгүй</p>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </CardContent>
        </Card>

        {/* Telegram Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Telegram мэдэгдэл
              </CardTitle>
              {telegramEnabled ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Идэвхтэй
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Идэвхгүй
                </Badge>
              )}
            </div>
            <CardDescription>
              Signal илэрсэн үед Telegram-аар мэдэгдэл авах
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
              <Input
                id="telegram_chat_id"
                value={profile?.telegram_chat_id || ""}
                onChange={(e) => setProfile({ ...profile!, telegram_chat_id: e.target.value })}
                placeholder="123456789"
              />
            </div>

            {/* Instructions */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Telegram ID хэрхэн авах вэ?</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Telegram дээр <code className="bg-muted px-1 rounded">@RawDataBot</code> хайж олоод нээ</li>
                <li><code className="bg-muted px-1 rounded">/start</code> команд ажиллуул</li>
                <li>Bot таны <strong>Chat ID</strong>-г харуулна (жишээ: 123456789)</li>
                <li>Тэр ID-г хуулж аваад энд оруул</li>
              </ol>
            </div>

            {telegramEnabled && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Telegram мэдэгдэл идэвхтэй байна. Signal илэрсэн үед танд Telegram-аар мэдэгдэл очно.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} disabled={saving} className="flex-1">
                {saving ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
              {telegramEnabled && (
                <Button
                  variant="outline"
                  onClick={handleTestTelegram}
                  disabled={testing}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {testing ? "Илгээж байна..." : "Тест"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
