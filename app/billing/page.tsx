"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type BillingStatus = {
  ok: boolean
  hasPaidAccess?: boolean
  paidAt?: string | null
  manualPaymentStatus?: "none" | "pending" | "approved" | "rejected"
  manualPaymentPlan?: string | null
  manualPaymentPayerEmail?: string | null
  manualPaymentTxnRef?: string | null
  manualPaymentNote?: string | null
  manualPaymentRequestedAt?: string | null
  manualPaymentReviewedAt?: string | null
  manualPaymentReviewedBy?: string | null
  message?: string
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [manualPlan, setManualPlan] = useState<string>("pro")
  const [payerEmail, setPayerEmail] = useState<string>("")
  const [txnRef, setTxnRef] = useState<string>("")
  const [note, setNote] = useState<string>("")

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

  const submitManualRequest = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/manual-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: manualPlan,
          payerEmail,
          txnRef,
          note,
        }),
      })
      if (res.status === 401) {
        window.location.href = "/auth/login"
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setMessage(data?.message ?? "Хүсэлт илгээх үед алдаа гарлаа")
        return
      }
      setMessage("Хүсэлт илгээгдлээ. Admin баталгаажуулсны дараа access нээгдэнэ.")
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const hasPaid = Boolean(status?.hasPaidAccess)
  const manualStatus = status?.manualPaymentStatus ?? "none"
  const manualPending = manualStatus === "pending"

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

              {/* Manual payment status */}
              {manualPending && (
                <div className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-800">
                  Таны гар төлбөрийн хүсэлт илгээгдсэн байна. Admin шалгаад access нээнэ.
                </div>
              )}
              {manualStatus === "rejected" && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm">
                  Таны хүсэлт татгалзсан байна. Мэдээллээ шалгаад дахин илгээнэ үү.
                </div>
              )}

              {/* Stripe */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-medium">Карт (Stripe)</div>
                <Button className="w-full" onClick={startCheckout} disabled={loading}>
                  {loading ? "Түр хүлээнэ үү..." : "Stripe төлбөр хийх"}
                </Button>
              </div>

              {/* Manual transfer */}
              <div className="space-y-3 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Дансаар шилжүүлэлт (гар баталгаажуулалт)</div>
                  <div className="text-xs text-muted-foreground">
                    Төлбөрөө шилжүүлээд payer Gmail + plan мэдээллээ явуулна. Admin баталгаажуулсны дараа access нээгдэнэ.
                  </div>
                </div>

                <div className="rounded-md bg-muted p-3 text-xs">
                  <div className="font-medium">Дансны мэдээлэл (жишээ)</div>
                  <div>Банк: TBD</div>
                  <div>Данс: TBD</div>
                  <div>Гүйлгээний утга: таны email эсвэл user id</div>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={manualPlan} onValueChange={setManualPlan}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="pro_plus">Pro+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payer Gmail</Label>
                    <Input
                      placeholder="payer@gmail.com"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      disabled={manualPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Гүйлгээний дугаар (optional)</Label>
                    <Input
                      placeholder="TXN123..."
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      disabled={manualPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Нэмэлт тайлбар (optional)</Label>
                    <Textarea
                      placeholder="Жишээ: 2026-01-12 өдөр 50,000₮ шилжүүлсэн"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={manualPending}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={submitManualRequest}
                    disabled={loading || manualPending || !payerEmail.trim()}
                  >
                    {manualPending ? "Хүлээгдэж байна" : loading ? "Түр хүлээнэ үү..." : "Хүсэлт илгээх"}
                  </Button>
                </div>
              </div>

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
