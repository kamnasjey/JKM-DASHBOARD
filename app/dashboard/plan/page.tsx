"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Crown, Check, Copy, Building2, CreditCard, Loader2, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { PLANS, BANK_INFO, getPlanById, type PlanType } from "@/lib/constants/pricing"

export default function PlanPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    payerEmail: "",
    txnRef: "",
    note: "",
  })

  // Get user's current plan from session
  const currentPlan = (session?.user as any)?.plan || "free"
  const userEmail = session?.user?.email || ""

  useEffect(() => {
    if (userEmail) {
      setFormData(prev => ({ ...prev, payerEmail: userEmail }))
    }
  }, [userEmail])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: "Хуулагдлаа", description: text })
  }

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "free" || planId === currentPlan) return
    setSelectedPlan(planId)
    setShowPaymentForm(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.payerEmail || !selectedPlan) {
      toast({ title: "Алдаа", description: "Төлбөр төлсөн email оруулна уу", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/billing/manual-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerEmail: formData.payerEmail,
          plan: selectedPlan,
          txnRef: formData.txnRef,
          note: formData.note,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Хүсэлт илгээхэд алдаа гарлаа")
      }

      toast({
        title: "Амжилттай",
        description: "Таны хүсэлт илгээгдлээ. 24 цагийн дотор эрх нээгдэнэ.",
      })

      // Reset form
      setShowPaymentForm(false)
      setSelectedPlan(null)
      setFormData({ payerEmail: userEmail, txnRef: "", note: "" })
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPlanIcon = (planId: PlanType) => {
    switch (planId) {
      case "free": return <Zap className="w-5 h-5" />
      case "pro": return <Crown className="w-5 h-5" />
      case "pro_plus": return <Sparkles className="w-5 h-5" />
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const selectedPlanData = selectedPlan ? getPlanById(selectedPlan) : null

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          Төлөвлөгөө
        </h1>
        <p className="text-muted-foreground mt-1">
          Таны одоогийн төлөвлөгөө: <Badge variant="outline" className="ml-1">{currentPlan.toUpperCase()}</Badge>
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan
          const isSelected = plan.id === selectedPlan

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all cursor-pointer hover:shadow-md",
                plan.popular && "border-primary shadow-sm",
                isSelected && "ring-2 ring-primary",
                isCurrentPlan && "bg-muted/30"
              )}
              onClick={() => handleSelectPlan(plan.id)}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className={cn(
                    plan.popular ? "bg-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-2.5 right-3">
                  <Badge variant="secondary">Одоогийн</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className={cn(
                  "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
                  plan.id === "free" && "bg-muted text-muted-foreground",
                  plan.id === "pro" && "bg-primary/10 text-primary",
                  plan.id === "pro_plus" && "bg-amber-500/10 text-amber-500"
                )}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-lg">{plan.nameMn}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-2xl font-bold">{plan.priceDisplay}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm">
                  {plan.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <span className="w-4 h-4 shrink-0" />
                      )}
                      <span className={cn(!feature.included && "text-muted-foreground/50")}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full mt-4",
                    plan.id === "pro_plus" && "bg-amber-500 hover:bg-amber-600"
                  )}
                  variant={plan.id === "free" || isCurrentPlan ? "outline" : "default"}
                  disabled={plan.id === "free" || isCurrentPlan}
                  size="sm"
                >
                  {isCurrentPlan ? "Одоогийн план" : plan.id === "free" ? "Үнэгүй" : "Сонгох"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payment Section - Shows when plan is selected */}
      {showPaymentForm && selectedPlanData && (
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Bank Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5" />
                Дансаар шилжүүлэх
              </CardTitle>
              <CardDescription>
                {selectedPlanData.nameMn} - {selectedPlanData.priceDisplay}{selectedPlanData.period}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
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
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(BANK_INFO.accountNumber, "account") }}
                    >
                      {copied === "account" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Хүлээн авагч:</span>
                  <span className="font-medium">{BANK_INFO.accountHolder}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Дүн:</span>
                  <span className="font-bold text-primary">{selectedPlanData.priceDisplay}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Гүйлгээний утга:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">JKM-{userEmail}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(`JKM-${userEmail}`, "ref") }}
                    >
                      {copied === "ref" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Confirmation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5" />
                Төлбөр баталгаажуулах
              </CardTitle>
              <CardDescription>
                Шилжүүлэг хийсний дараа баталгаажуулна уу
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Label htmlFor="txnRef">Гүйлгээний дугаар</Label>
                  <Input
                    id="txnRef"
                    value={formData.txnRef}
                    onChange={(e) => setFormData({ ...formData, txnRef: e.target.value })}
                    placeholder="TXN123456..."
                  />
                </div>

                <div>
                  <Label htmlFor="note">Тэмдэглэл</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Нэмэлт мэдээлэл..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowPaymentForm(false); setSelectedPlan(null) }}
                  >
                    Цуцлах
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Илгээж байна...
                      </>
                    ) : (
                      "Хүсэлт илгээх"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Төлбөрийн flow:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Төлөвлөгөө сонгоно</li>
              <li>Банкны дансруу шилжүүлнэ</li>
              <li>Гүйлгээний мэдээллээ баталгаажуулна</li>
              <li>24 цагийн дотор таны эрх нээгдэнэ</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
