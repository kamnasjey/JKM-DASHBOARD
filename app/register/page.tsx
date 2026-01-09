"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthGuard } from "@/lib/auth-guard"

export default function RegisterPage() {
  useAuthGuard(false)

  const [step, setStep] = useState<"register" | "verify">("register")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [telegramHandle, setTelegramHandle] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const DEMO_MESSAGE = "Одоогоор демо горим — Google-ээр нэвтрэхээр үргэлжлүүлнэ."

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(DEMO_MESSAGE)
    setStep("verify")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(DEMO_MESSAGE)
  }

  const handleResendCode = async () => {
    setMessage(DEMO_MESSAGE)
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
                Одоогоор демо горим — Google-ээр нэвтрэхээр үргэлжлүүлнэ.
              </div>
              {message && <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">{message}</div>}
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
              <Button type="button" className="w-full" disabled>
                Google-ээр нэвтрэх (удахгүй)
              </Button>
              <Button type="button" className="w-full" disabled={code.length !== 6} onClick={() => setMessage(DEMO_MESSAGE)}>
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
              Одоогоор демо горим — Google-ээр нэвтрэхээр үргэлжлүүлнэ.
            </div>

            {message && <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">{message}</div>}

            <Button type="button" className="w-full" disabled>
              Google-ээр нэвтрэх (удахгүй)
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
            <Button type="button" className="w-full" onClick={() => setMessage(DEMO_MESSAGE)}>
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
