"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

export default function RegisterPage() {
  useAuthGuard(false)

  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    telegram_handle: "",
    strategy_note: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await auth.register(formData)
      toast({
        title: "Амжилттай бүртгэгдлээ",
        description: "Имэйл хаягаа баталгаажуулна уу",
      })
      router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`)
    } catch (error: any) {
      toast({
        title: "Алдаа гарлаа",
        description: error.message || "Бүртгэх үед алдаа гарлаа",
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
          <CardDescription>Шинэ хэрэглэгч бүртгүүлэх</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Нэр</Label>
              <Input
                id="name"
                type="text"
                placeholder="Таны нэр"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram хаяг (сонголттой)</Label>
              <Input
                id="telegram"
                type="text"
                placeholder="@username"
                value={formData.telegram_handle}
                onChange={(e) => setFormData({ ...formData, telegram_handle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">Стратегийн тэмдэглэл (сонголттой)</Label>
              <Input
                id="strategy"
                type="text"
                placeholder="Миний стратеги..."
                value={formData.strategy_note}
                onChange={(e) => setFormData({ ...formData, strategy_note: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Бүртгэлтэй юу?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Нэвтрэх
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
