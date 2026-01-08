"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { User, Database, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const data = await authApi.me()
      setUser(data)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: error.message,
      })
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Тохиргоо</h1>
        <p className="text-muted-foreground">Хэрэглэгчийн мэдээлэл ба тохиргоо</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Хувийн мэдээлэл</CardTitle>
            </div>
            <CardDescription>Таны бүртгэлийн мэдээлэл</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Нэр</Label>
              <Input value={user?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>И-мэйл</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Telegram</Label>
              <Input value={user?.telegram_handle || "—"} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>API холболт</CardTitle>
            </div>
            <CardDescription>Backend API тохиргоо</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input value={process.env.NEXT_PUBLIC_API_BASE_URL || "Not set"} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable-аас уншсан. Өөрчлөх бол .env.local файлыг засна.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Анхаарал татах үйлдлүүд</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div>
              <p className="font-medium">Бүх өгөгдөл устгах</p>
              <p className="text-sm text-muted-foreground">Таны бүх setup болон түүхийг устгана</p>
            </div>
            <Button variant="destructive" size="sm">
              Устгах
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
