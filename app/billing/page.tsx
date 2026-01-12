"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BillingStatus = {
  ok: boolean
  hasPaidAccess?: boolean
  paidAt?: string | null
  message?: string
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const refresh = async () => {
    const res = await fetch("/api/billing/status")
    if (res.status === 401) {
      window.location.href = "/auth/login"
      return
    }
    const data = (await res.json()) as BillingStatus
    setStatus(data)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "1") {
      setMessage("Төлбөр амжилттай. Access идэвхжүүлэхийг хүлээнэ үү (хэдэн секунд).")
      // Webhook may take a moment; refresh a few times
      refresh()
      const id = window.setInterval(refresh, 2500)
      window.setTimeout(() => window.clearInterval(id), 15000)
      return
    }
    if (params.get("canceled") === "1") {
      setMessage("Төлбөр цуцлагдлаа.")
    }
    refresh()
  }, [])

  const startCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/create-checkout-session", { method: "POST" })
      if (res.status === 401) {
        window.location.href = "/auth/login"
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setMessage(data?.message ?? "Төлбөр эхлүүлэхэд алдаа гарлаа")
        return
      }
      if (data?.alreadyPaid) {
        setMessage("Таны access аль хэдийн идэвхтэй байна.")
        await refresh()
        return
      }
      if (data?.url) {
        window.location.href = data.url
      } else {
        setMessage("Checkout URL олдсонгүй")
      }
    } finally {
      setLoading(false)
    }
  }

  const hasPaid = Boolean(status?.hasPaidAccess)

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Төлбөр & Access</CardTitle>
          <CardDescription>Төлбөрөө хийж бүх функцыг нээнэ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="rounded-md bg-muted p-3 text-sm">{message}</div>}

          {hasPaid ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700">
                Access идэвхтэй байна.
              </div>
              <Button asChild className="w-full">
                <Link href="/dashboard">Dashboard руу орох</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-destructive/10 p-3 text-sm">
                Access идэвхгүй байна. Төлбөр хийсний дараа dashboard-ийн бүх функц нээгдэнэ.
              </div>
              <Button className="w-full" onClick={startCheckout} disabled={loading}>
                {loading ? "Түр хүлээнэ үү..." : "Төлбөр хийх"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Буцах</Link>
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Анхаар: Webhook-аар access идэвхжинэ. Хэрвээ төлбөр хийсний дараа access нээгдэхгүй байвал
            хэсэг хүлээгээд энэ хуудсыг refresh хийнэ үү.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
