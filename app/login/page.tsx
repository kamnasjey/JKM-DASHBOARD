"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthGuard } from "@/lib/auth-guard"

export default function LoginPage() {
  useAuthGuard(false)

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>JKM Trading AI</CardTitle>
          <CardDescription>Нэвтрэх</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" className="w-full" size="lg" onClick={handleGoogleLogin}>
            Google-ээр нэвтрэх
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Нэвтрэх нь үйлчилгээний нөхцөл болон нууцлалын бодлогыг хүлээн зөвшөөрч байна гэсэн үг юм.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
