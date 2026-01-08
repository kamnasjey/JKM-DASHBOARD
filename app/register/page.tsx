"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useAuthGuard } from "@/lib/auth-guard"

export default function RegisterPage() {
  useAuthGuard(false)

  const [step, setStep] = useState<"register" | "verify">("register")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [telegramHandle, setTelegramHandle] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Одоогоор демо горим",
      description: "Google-ээр нэвтэрч ашиглана уу.",
    })
    setStep("verify")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Одоогоор демо горим",
      description: "Бүртгэл/код баталгаажуулалт идэвхгүй. Google-ээр нэвтэрнэ үү.",
    })
  }

  const handleResendCode = async () => {
    toast({
      title: "Код дахин илгээх",
      description: "Одоогоор демо горим",
    })
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google нэвтрэлт амжилтгүй",
        description: error?.message || "Дахин оролдоно уу.",
      })
      setLoading(false)
    }
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>И-мэйл баталгаажуулалт</CardTitle>
            <CardDescription>{email} хаягруу илгээсэн 6 оронтой кодыг оруулна уу</CardDescription>
          </CardHeader>
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                Одоогоор демо горим — Google-ээр нэвтэрч ашиглана уу.
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Баталгаажуулах код</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="button" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Нэвтэрч байна...
                  </>
                ) : (
                  "Google-ээр нэвтрэх"
                )}
              </Button>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                "Баталгаажуулах (демо)"
              </Button>
              <Button type="button" variant="link" onClick={handleResendCode}>
                Код дахин илгээх
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Бүртгүүлэх</CardTitle>
          <CardDescription>JKM Trading AI хэрэглэгч үүсгэх</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              Одоогоор демо горим — Google-ээр нэвтэрч ашиглана уу.
            </div>

            <Button type="button" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Нэвтэрч байна...
                </>
              ) : (
                "Google-ээр нэвтрэх"
              )}
            </Button>

            <div className="text-xs text-muted-foreground">Эсвэл (демо) бүртгүүлэх:</div>
            <div className="space-y-2">
              <Label htmlFor="name">Нэр</Label>
              <Input id="name" placeholder="Таны нэр" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">И-мэйл</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram (заавал биш)</Label>
              <Input
                id="telegram"
                placeholder="@username"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              "Бүртгүүлэх (демо)"
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Бүртгэлтэй юу?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Нэвтрэх
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
