"use client"

import { useState, useEffect } from "react"
import { User, Terminal } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [commandText, setCommandText] = useState("")

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.profile()
      setProfile(data)
    } catch (err: any) {
      console.error("[v0] Failed to load profile:", err)
      // Fall back to session info so Google users still see their name/email.
      setProfile({
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
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
      await api.updateProfile({ profile })
      const rawChatId = typeof profile?.telegram_chat_id === "string" ? profile.telegram_chat_id.trim() : ""
      await api.updateUserPrefs({
        telegram_chat_id: rawChatId || null,
        telegram_enabled: Boolean(rawChatId),
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

  const handleSaveCommand = async () => {
    setSaving(true)
    try {
      await api.updateProfile({ command: commandText })
      toast({
        title: "Амжилттай",
        description: "Command илгээгдлээ",
      })
      setCommandText("")
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err.message || "Command илгээх үед алдаа гарлаа",
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

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="command">Command Mode</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
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
                  <Label htmlFor="name">Нэр</Label>
                  <Input
                    id="name"
                    value={profile?.name || session?.user?.name || ""}
                    onChange={(e) =>
                      setProfile((prev: any) => ({
                        ...(prev ?? {}),
                        name: e.target.value,
                        email: (prev?.email ?? session?.user?.email ?? "") as string,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Имэйл</Label>
                  <Input id="email" value={profile?.email || session?.user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">Имэйл солих боломжгүй</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegram">Telegram хаяг</Label>
                  <Input
                    id="telegram"
                    value={profile?.telegram_handle || ""}
                    onChange={(e) => setProfile({ ...profile!, telegram_handle: e.target.value })}
                    placeholder="@username"
                  />
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
                    Telegram Bot-аар холбогдоогүй бол чат ID-гаа энд оруулна.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy_note">Стратегийн тэмдэглэл</Label>
                  <Textarea
                    id="strategy_note"
                    value={profile?.strategy_note || ""}
                    onChange={(e) => setProfile({ ...profile!, strategy_note: e.target.value })}
                    rows={4}
                    placeholder="Таны стратеги..."
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="command">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Command Mode
                </CardTitle>
                <CardDescription>Advanced: STR: эсвэл бусад command илгээх</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="command">Command текст</Label>
                  <Textarea
                    id="command"
                    value={commandText}
                    onChange={(e) => setCommandText(e.target.value)}
                    rows={8}
                    placeholder="STR: миний стратегийн тохиргоо..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Жишээ: STR: ... эсвэл бусад backend command</p>
                </div>

                <Button onClick={handleSaveCommand} disabled={saving || !commandText} className="w-full">
                  {saving ? "Илгээж байна..." : "Command илгээх"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
