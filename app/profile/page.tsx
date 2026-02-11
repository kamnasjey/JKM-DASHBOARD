"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { User, CheckCircle, XCircle, MessageCircle, Send, TrendingUp, LinkIcon, RefreshCw, Unlink, Loader2, ExternalLink } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { useLanguage } from "@/contexts/language-context"
import { useSession } from "next-auth/react"
import { InfoTooltip } from "@/components/guide/info-tooltip"

export default function ProfilePage() {
  useAuthGuard(true)

  const { data: session } = useSession()
  const { toast } = useToast()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [profile, setProfile] = useState<any | null>(null)

  // Telegram connect state
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    loadProfile()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
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
        min_rr: 2.5,
        min_score: 0,
      })
      toast({
        title: t("Error", "Алдаа"),
        description: t("Failed to load profile", "Profile ачаалж чадсангүй"),
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
      const displayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : ""

      await api.updateUserPrefs({
        display_name: displayName || null,
        min_rr: profile?.min_rr ?? 2.5,
        min_score: profile?.min_score ?? 0,
      })

      toast({
        title: t("Saved", "Амжилттай"),
        description: t("Profile saved", "Profile хадгалагдлаа"),
      })
    } catch (err: any) {
      toast({
        title: t("Error", "Алдаа"),
        description: err.message || t("Failed to save", "Хадгалах үед алдаа гарлаа"),
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
        title: t("Sent", "Амжилттай"),
        description: result.message || t("Test message sent! Check your Telegram.", "Тест мессеж илгээгдлээ! Telegram-аа шалгана уу."),
      })
    } catch (err: any) {
      toast({
        title: t("Error", "Алдаа"),
        description: err.message || t("Failed to send test", "Telegram тест илгээхэд алдаа гарлаа"),
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  // --- One-click Telegram connect ---
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollCountRef.current = 0
  }, [])

  const handleConnectTelegram = async () => {
    setConnecting(true)
    try {
      const result = await api.telegramConnect()
      if (!result.ok || !result.url) {
        throw new Error("Холболтын линк авч чадсангүй")
      }

      // Open Telegram deep link
      window.open(result.url, "_blank")

      // Start polling for connection
      pollCountRef.current = 0
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1

        // Timeout after 30 polls (90 seconds)
        if (pollCountRef.current > 30) {
          stopPolling()
          setConnecting(false)
          toast({
            title: t("Timeout", "Хугацаа дууслаа"),
            description: t("Connection timed out. Please try again.", "Холболт хугацаа хэтэрлээ. Дахин оролдоно уу."),
            variant: "destructive",
          })
          return
        }

        try {
          const freshProfile = await api.profile()
          if (freshProfile?.telegram_chat_id) {
            stopPolling()
            setProfile(freshProfile)
            setConnecting(false)
            toast({
              title: t("Connected!", "Холбогдлоо!"),
              description: t("Telegram connected successfully! You will now receive setup notifications.", "Telegram амжилттай холбогдлоо! Та одоо setup мэдэгдэл хүлээн авна."),
            })
          }
        } catch {
          // Ignore poll errors
        }
      }, 3000)
    } catch (err: any) {
      setConnecting(false)
      toast({
        title: t("Error", "Алдаа"),
        description: err.message || t("Failed to connect", "Холбоход алдаа гарлаа"),
        variant: "destructive",
      })
    }
  }

  const handleCancelConnect = () => {
    stopPolling()
    setConnecting(false)
  }

  const handleDisconnectTelegram = async () => {
    setDisconnecting(true)
    try {
      await api.updateUserPrefs({
        telegram_chat_id: null,
        telegram_enabled: false,
      })
      setProfile((prev: any) => ({
        ...prev,
        telegram_chat_id: null,
        telegram_enabled: false,
      }))
      toast({
        title: t("Disconnected", "Салгагдлаа"),
        description: t("Telegram disconnected", "Telegram холболт салгагдлаа"),
      })
    } catch (err: any) {
      toast({
        title: t("Error", "Алдаа"),
        description: err.message || t("Failed to disconnect", "Салгахад алдаа гарлаа"),
        variant: "destructive",
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const hasTelegramId = Boolean(profile?.telegram_chat_id?.trim())
  const telegramEnabled = hasTelegramId && profile?.telegram_enabled

  // Mask chat ID for display
  const maskedChatId = profile?.telegram_chat_id
    ? "***" + String(profile.telegram_chat_id).slice(-4)
    : ""

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t("Loading...", "Ачааллаж байна...")}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">{t("Your personal information and settings", "Таны хувийн мэдээлэл болон тохиргоо")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("Personal Information", "Хувийн мэдээлэл")}
            </CardTitle>
            <CardDescription>{t("Edit your information", "Таны мэдээллийг засварлах")}</CardDescription>
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

        {/* Trading Settings Card */}
        <Card data-tour="risk-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trading тохиргоо
            </CardTitle>
            <CardDescription>Scanner болон Simulator-т ашиглагдах тохиргоо</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_rr" className="flex items-center gap-1">Minimum Risk/Reward (RR) <InfoTooltip textMn="TP-ийн доод хязгаар. 2.5 = SL-ээс 2.5 дахин хол TP байрлана" textEn="Minimum TP distance. 2.5 = TP is 2.5x farther than SL" /></Label>
                <Input
                  id="min_rr"
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  value={profile?.min_rr ?? 2.5}
                  onChange={(e) =>
                    setProfile((prev: any) => ({
                      ...(prev ?? {}),
                      min_rr: parseFloat(e.target.value) || 2.5,
                    }))
                  }
                  placeholder="2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Хамгийн бага RR (1:X). Жишээ: 2.5 = 1:2.5
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_score" className="flex items-center gap-1">Minimum Score <InfoTooltip textMn="Дохионы итгэлийн доод хязгаар. 0 = шүүлтгүй, 0.5-0.6 зөвлөмж" textEn="Minimum confidence score. 0 = no filter, 0.5-0.6 recommended" /></Label>
                <Input
                  id="min_score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5.0"
                  value={profile?.min_score ?? 0}
                  onChange={(e) =>
                    setProfile((prev: any) => ({
                      ...(prev ?? {}),
                      min_score: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Setup-ийн доод оноо (0 = шүүлтгүй)
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Эдгээр утгыг Scanner болон Simulator хоёулаа ашиглана.
                RR {profile?.min_rr ?? 2.5}-ээс бага trade-ийг алгасна.
              </p>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </CardContent>
        </Card>

        {/* Telegram Settings Card */}
        <Card data-tour="telegram-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Telegram мэдэгдэл
              </CardTitle>
              {connecting ? (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t("Connecting...", "Холбож байна...")}
                </Badge>
              ) : telegramEnabled ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t("Active", "Идэвхтэй")}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t("Inactive", "Идэвхгүй")}
                </Badge>
              )}
            </div>
            <CardDescription>
              {t("Receive Telegram notifications when setups are found", "Setup илэрсэн үед Telegram-аар мэдэгдэл авах")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* State: Connecting (waiting for user to press Start in Telegram) */}
            {connecting && (
              <>
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      {t("Waiting for Telegram connection...", "Telegram холболт хүлээж байна...")}
                    </p>
                  </div>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>{t("Telegram app should have opened", "Telegram апп нээгдсэн байх ёстой")}</li>
                    <li>{t("Press the \"Start\" button in the bot", "Bot дээр \"Start\" товч дарна уу")}</li>
                    <li>{t("This page will update automatically", "Энэ хуудас автоматаар шинэчлэгдэнэ")}</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCancelConnect}
                  className="w-full"
                >
                  {t("Cancel", "Цуцлах")}
                </Button>
              </>
            )}

            {/* State: Connected */}
            {!connecting && telegramEnabled && (
              <>
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {t("Telegram connected", "Telegram холбогдсон")}
                      {maskedChatId && <span className="ml-2 font-mono text-xs opacity-70">ID: {maskedChatId}</span>}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("You will receive notifications when trading setups are found.", "Setup илэрсэн үед танд мэдэгдэл очно.")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestTelegram}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {testing ? t("Sending...", "Илгээж байна...") : t("Send Test", "Тест илгээх")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleConnectTelegram}
                    disabled={connecting}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("Reconnect", "Дахин холбох")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDisconnectTelegram}
                    disabled={disconnecting}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Unlink className="h-4 w-4" />
                    {disconnecting ? "..." : t("Disconnect", "Салгах")}
                  </Button>
                </div>
              </>
            )}

            {/* State: Not connected */}
            {!connecting && !telegramEnabled && (
              <>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Connect your Telegram to receive instant notifications when trading setups are detected.",
                      "Telegram-аа холбож, арилжааны setup илэрсэн үед шууд мэдэгдэл авна уу."
                    )}
                  </p>
                </div>

                <Button
                  onClick={handleConnectTelegram}
                  disabled={connecting}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("Connect Telegram", "Telegram холбох")}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {t(
                    "Pressing the button will open Telegram. Just press \"Start\" and you're connected!",
                    "Товч дарахад Telegram нээгдэнэ. \"Start\" дарахад л болно!"
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
