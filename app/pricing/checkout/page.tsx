"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Zap, Copy, Check, ArrowLeft, Building2, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { PLANS, BANK_INFO, getPlanById, type PlanType } from "@/lib/constants/pricing"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { data: session, status: sessionStatus } = useSession()

  const planId = searchParams.get("plan") as PlanType
  const plan = getPlanById(planId)

  const [copied, setCopied] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    payerEmail: "",
    txnRef: "",
    note: "",
  })

  // Check if user is already logged in
  const isLoggedIn = sessionStatus === "authenticated" && session?.user?.email

  useEffect(() => {
    if (!plan || plan.id === "starter") {
      router.push("/pricing")
    }
  }, [plan, router])

  // If user is already logged in, skip registration and set their email
  useEffect(() => {
    if (isLoggedIn && session?.user?.email) {
      setIsRegistered(true)
      setUserEmail(session.user.email)
      setFormData(prev => ({ ...prev, payerEmail: session.user?.email || "" }))
    }
  }, [isLoggedIn, session])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: "Хуулагдлаа", description: text })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast({ title: "Алдаа", description: "Email болон нууц үг оруулна уу", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/auth/local/register-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Бүртгэл амжилтгүй")
      }

      setUserEmail(formData.email)
      setFormData((prev) => ({ ...prev, payerEmail: formData.email }))
      setIsRegistered(true)
      toast({ title: "Амжилттай", description: "Бүртгэл амжилттай. Одоо төлбөрөө баталгаажуулна уу." })
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.payerEmail) {
      toast({ title: "Алдаа", description: "Төлбөр төлсөн email оруулна уу", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      // If user is not already logged in, we need to sign them in first
      if (!isLoggedIn) {
        const { signIn } = await import("next-auth/react")
        const loginRes = await signIn("email-password", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (loginRes?.error) {
          throw new Error("Нэвтрэх алдаа: " + loginRes.error)
        }
      }

      // Submit payment request
      const res = await fetch("/api/billing/manual-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerEmail: formData.payerEmail,
          plan: planId,
          txnRef: formData.txnRef,
          note: formData.note,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Хүсэлт илгээхэд алдаа гарлаа")
      }

      // Redirect to success page
      router.push("/pricing/success")
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!plan) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">JKM Copilot</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Link href="/pricing" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Буцах
        </Link>

        {/* Plan Summary */}
        <div className="bg-card border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{plan.nameMn} төлөвлөгөө</h1>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold">{plan.priceDisplay}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
          </div>
        </div>

        {sessionStatus === "loading" ? (
          /* Loading session */
          <div className="bg-card border rounded-xl p-6 mb-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isRegistered ? (
          /* Step 1: Registration (only for new users) */
          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
              Бүртгүүлэх
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="name">Нэр (optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Таны нэр"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Нууц үг *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Бүртгэж байна...
                  </>
                ) : (
                  "Бүртгүүлэх"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Бүртгэлтэй юу?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Нэвтрэх
              </Link>
            </div>
          </div>
        ) : (
          /* Logged in user info */
          isLoggedIn && (
            <div className="bg-card border rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Нэвтэрсэн</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </div>
          )
        )}

        {isRegistered && (
          <>
            {/* Step 2: Bank Info */}
            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Дансаар шилжүүлэх
              </h2>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Банк:</span>
                  <span className="font-medium">{BANK_INFO.bankName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Данс:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{BANK_INFO.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(BANK_INFO.accountNumber, "account")}
                    >
                      {copied === "account" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Хүлээн авагч:</span>
                  <span className="font-medium">{BANK_INFO.accountHolder}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">IBAN:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{BANK_INFO.iban}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(BANK_INFO.iban, "iban")}
                    >
                      {copied === "iban" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Дүн:</span>
                  <span className="font-bold text-lg">{plan.priceDisplay}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Гүйлгээний утга:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-primary">JKM-{userEmail}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`JKM-${userEmail}`, "ref")}
                    >
                      {copied === "ref" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Confirmation Form */}
            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Төлбөр баталгаажуулах
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                Шилжүүлэг хийсний дараа доорх мэдээллийг бөглөнө үү.
                24 цагийн дотор таны эрх нээгдэнэ.
              </p>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="payerEmail">Төлбөр төлсөн email *</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    required
                    value={formData.payerEmail}
                    onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })}
                    placeholder="Банкны гүйлгээнд ашигласан email"
                  />
                </div>

                <div>
                  <Label htmlFor="txnRef">Гүйлгээний дугаар (optional)</Label>
                  <Input
                    id="txnRef"
                    value={formData.txnRef}
                    onChange={(e) => setFormData({ ...formData, txnRef: e.target.value })}
                    placeholder="TXN123456..."
                  />
                </div>

                <div>
                  <Label htmlFor="note">Тэмдэглэл (optional)</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Нэмэлт мэдээлэл..."
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Илгээж байна...
                    </>
                  ) : (
                    "Баталгаажуулах"
                  )}
                </Button>
              </form>
            </div>

            {/* QPay Coming Soon */}
            <div className="bg-muted/30 border border-dashed rounded-xl p-6 text-center">
              <div className="text-muted-foreground">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">QPay</p>
                <p className="text-sm">Удахгүй нэмэгдэнэ...</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
