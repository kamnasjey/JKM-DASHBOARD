"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthGuard } from "@/lib/auth-guard"

export default function LoginPage() {
  useAuthGuard(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const DEMO_MESSAGE = "Одоогоор демо горим — Google-ээр нэвтрэхээр үргэлжлүүлнэ."

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(DEMO_MESSAGE)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Нэвтрэх</CardTitle>
          <CardDescription>JKM Trading AI системд нэвтрэх</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <Button type="button" className="w-full" disabled>
              Google-ээр нэвтрэх (удахгүй)
            </Button>

            {message && <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">{message}</div>}

            <div className="text-xs text-muted-foreground">Эсвэл (демо) и-мэйл/нууц үг:</div>
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
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="button" className="w-full" onClick={() => setMessage(DEMO_MESSAGE)}>
              "Нэвтрэх (демо)"
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Шинэ хэрэглэгч үү?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Бүртгүүлэх
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
