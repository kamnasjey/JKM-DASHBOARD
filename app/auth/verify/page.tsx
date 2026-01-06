"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { auth, setToken } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: "Алдаа",
        description: "Имэйл хаяг олдсонгүй",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await auth.verifyCode({ email, code })
      setToken(response.token)
      toast({
        title: "Амжилттай баталгаажлаа",
        description: "Таны систем рүү нэвтэрлээ",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Алдаа гарлаа",
        description: error.message || "Код буруу байна",
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
          <CardTitle className="text-2xl font-bold">Имэйл баталгаажуулах</CardTitle>
          <CardDescription>
            {email ? `${email} хаяг руу илгээсэн 6 оронтой кодыг оруулна уу` : "6 оронтой кодыг оруулна уу"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Баталгаажуулах код</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? "Баталгаажуулж байна..." : "Баталгаажуулах"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
