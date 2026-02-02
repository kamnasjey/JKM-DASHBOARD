"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
      // Fall back to session info so Google users still see their name/email.
      setProfile({
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        display_name: "",
        telegram_chat_id: "",
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

      // Save to Firestore
      await api.updateUserPrefs({
        telegram_chat_id: rawChatId || null,
        telegram_enabled: Boolean(rawChatId),
        display_name: displayName || null,
      })
      toast({
        title: "Амжилттай",
        description: "Profile хадгалагдлаа",
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

            <div className="space-y-2">
              <Label htmlFor="telegram_chat_id">Telegram ID</Label>
              <Input
                id="telegram_chat_id"
                value={profile?.telegram_chat_id || ""}
                onChange={(e) => setProfile({ ...profile!, telegram_chat_id: e.target.value })}
                placeholder="123456789"
              />
              <p className="text-xs text-muted-foreground">
                Telegram Bot-д /start илгээгээд авсан ID-гаа энд оруулна.
              </p>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
