"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { auth, setToken } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

export default function LoginPage() {
  useAuthGuard(false)

  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await auth.login(formData)
      setToken(response.token)
      toast({
        title: "Амжилттай нэвтэрлээ",
        description: "Таны систем рүү нэвтэрлээ",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Алдаа гарлаа",
        description: error.message || "Нэвтрэх үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">JKM Trading AI</CardTitle>
          <CardDescription>Таны trading туслах систем</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Имэйл хаяг</Label>
              <Input
                id="email"
                type="email"
                placeholder="ta@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Бүртгэлгүй юу?{" "}
              <Link href="/auth/register" className="text-primary hover:underline">
                Бүртгүүлэх
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
