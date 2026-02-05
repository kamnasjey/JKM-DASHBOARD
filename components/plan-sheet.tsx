"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Crown, Check, Copy, Building2, CreditCard, Loader2, Sparkles, Zap, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { PLANS, BANK_INFO, getPlanById, type PlanType } from "@/lib/constants/pricing"

interface PlanSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlanSheet({ open, onOpenChange }: PlanSheetProps) {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    payerEmail: "",
    note: "",
  })

  const currentPlan = (session?.user as any)?.plan || "starter"
  const userEmail = session?.user?.email || ""

  useEffect(() => {
    if (userEmail) {
      setFormData(prev => ({ ...prev, payerEmail: userEmail }))
    }
  }, [userEmail])

  // Reset when sheet closes
  useEffect(() => {
    if (!open) {
      setSelectedPlan(null)
    }
  }, [open])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: "Хуулагдлаа", description: text })
  }

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "starter" || planId === currentPlan) return
    setSelectedPlan(planId)
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

      onOpenChange(false)
      setSelectedPlan(null)
      setFormData({ payerEmail: userEmail, note: "" })
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPlanIcon = (planId: PlanType) => {
    switch (planId) {
      case "starter": return <Zap className="w-4 h-4" />
      case "pro": return <Crown className="w-4 h-4" />
      case "pro_plus": return <Sparkles className="w-4 h-4" />
    }
  }

  const selectedPlanData = selectedPlan ? getPlanById(selectedPlan) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[380px] sm:w-[420px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center gap-2">
            {selectedPlan ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPlan(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Төлбөр төлөх</span>
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 text-yellow-500" />
                <span>Төлөвлөгөө</span>
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {!selectedPlan ? (
            <>
              {/* Current Plan */}
              <div className="text-sm text-muted-foreground">
                Одоогийн: <Badge variant="outline">{currentPlan.toUpperCase()}</Badge>
              </div>

              {/* Plan Cards */}
              {PLANS.map((plan) => {
                const isCurrentPlan = plan.id === currentPlan
                const isDisabled = plan.id === "starter" || isCurrentPlan

                return (
                  <div
                    key={plan.id}
                    onClick={() => !isDisabled && handleSelectPlan(plan.id)}
                    className={cn(
                      "relative rounded-lg border p-4 transition-all",
                      !isDisabled && "cursor-pointer hover:border-primary hover:shadow-sm",
                      isDisabled && "opacity-60",
                      plan.popular && "border-primary",
                      isCurrentPlan && "bg-muted/30"
                    )}
                  >
                    {plan.badge && (
                      <Badge className={cn(
                        "absolute -top-2 right-3 text-xs",
                        plan.popular ? "bg-primary" : "bg-muted"
                      )}>
                        {plan.badge}
                      </Badge>
                    )}

                    {isCurrentPlan && (
                      <Badge variant="secondary" className="absolute -top-2 left-3 text-xs">
                        Одоогийн
                      </Badge>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        plan.id === "starter" && "bg-muted text-muted-foreground",
                        plan.id === "pro" && "bg-primary/10 text-primary",
                        plan.id === "pro_plus" && "bg-amber-500/10 text-amber-500"
                      )}>
                        {getPlanIcon(plan.id)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-semibold">{plan.nameMn}</h3>
                          <div className="text-right">
                            <span className="font-bold">{plan.priceDisplay}</span>
                            {plan.period && <span className="text-xs text-muted-foreground">{plan.period}</span>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>

                        <ul className="mt-2 space-y-1">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs">
                              {f.included ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <span className="w-3 h-3" />
                              )}
                              <span className={cn(!f.included && "text-muted-foreground/50")}>
                                {f.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : selectedPlanData && (
            <>
              {/* Selected Plan Summary */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedPlanData.nameMn}</span>
                  <span className="font-bold text-primary">{selectedPlanData.priceDisplay}{selectedPlanData.period}</span>
                </div>
              </div>

              {/* Bank Info */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4" />
                  Банкны мэдээлэл
                </h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Банк:</span>
                    <span>{BANK_INFO.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Данс:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{BANK_INFO.accountNumber}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(BANK_INFO.accountNumber, "account")}>
                        {copied === "account" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Хүлээн авагч:</span>
                    <span>{BANK_INFO.accountHolder}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Гүйлгээний утга:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-primary">JKM-{userEmail}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(`JKM-${userEmail}`, "ref")}>
                        {copied === "ref" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <form onSubmit={handlePaymentSubmit} className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4" />
                  Төлбөр баталгаажуулах
                </h4>

                <div>
                  <Label htmlFor="payerEmail" className="text-xs">Email *</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    required
                    value={formData.payerEmail}
                    onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="note" className="text-xs">Тэмдэглэл</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Илгээж байна...
                    </>
                  ) : (
                    "Хүсэлт илгээх"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  24 цагийн дотор таны эрх нээгдэнэ
                </p>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
