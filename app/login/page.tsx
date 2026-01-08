"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useAuthGuard } from "@/lib/auth-guard"

export default function LoginPage() {
  useAuthGuard(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Одоогоор демо горим",
      description: "Google-ээр нэвтэрч ашиглана уу.",
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Нэвтрэх</CardTitle>
          <CardDescription>JKM Trading AI системд нэвтрэх</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
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
