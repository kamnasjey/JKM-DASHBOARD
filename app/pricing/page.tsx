"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, X, Zap, Crown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLANS, type PlanType } from "@/lib/constants/pricing"

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "free") {
      router.push("/auth/register?plan=free")
    } else {
      router.push(`/pricing/checkout?plan=${planId}`)
    }
  }

  const getPlanIcon = (planId: PlanType) => {
    switch (planId) {
      case "free":
        return <Zap className="w-6 h-6" />
      case "pro":
        return <Crown className="w-6 h-6" />
      case "pro_plus":
        return <Sparkles className="w-6 h-6" />
    }
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
          <Link href="/auth/login">
            <Button variant="ghost">Нэвтрэх</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Үнийн төлөвлөгөө
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Таны арилжааны түвшинд тохирсон төлөвлөгөө сонгоорой
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg",
                plan.popular && "border-primary shadow-md scale-105 z-10",
                selectedPlan === plan.id && "ring-2 ring-primary"
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full",
                    plan.popular
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center",
                  plan.id === "free" && "bg-muted text-muted-foreground",
                  plan.id === "pro" && "bg-primary/10 text-primary",
                  plan.id === "pro_plus" && "bg-amber-500/10 text-amber-500"
                )}>
                  {getPlanIcon(plan.id)}
                </div>
                <h2 className="text-2xl font-bold mb-1">{plan.nameMn}</h2>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    )}
                    <span className={cn(
                      "text-sm",
                      !feature.included && "text-muted-foreground/50"
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                className={cn(
                  "w-full",
                  plan.popular && "bg-primary hover:bg-primary/90",
                  plan.id === "pro_plus" && "bg-amber-500 hover:bg-amber-600 text-white"
                )}
                variant={plan.id === "free" ? "outline" : "default"}
                size="lg"
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.id === "free" ? "Эхлэх" : "Сонгох"}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Түгээмэл асуултууд</h2>

          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border">
              <h3 className="font-semibold mb-2">Төлбөрөө хэрхэн төлөх вэ?</h3>
              <p className="text-muted-foreground text-sm">
                Одоогоор дансаар шилжүүлэх боломжтой. QPay удахгүй нэмэгдэнэ.
                Шилжүүлсний дараа 24 цагийн дотор таны эрх нээгдэнэ.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="font-semibold mb-2">Strategy хослол гэж юу вэ?</h3>
              <p className="text-muted-foreground text-sm">
                Манай систем 31 detector-тэй. Эдгээрийг хослуулан strategy үүсгэнэ.
                Pro нь 5 хослол, Pro+ нь 15 хослол (бүгд) дээр ажиллана.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="font-semibold mb-2">Simulator хэдэн удаа ажиллуулах вэ?</h3>
              <p className="text-muted-foreground text-sm">
                Pro хэрэглэгч өдөрт 5 удаа, Pro+ хэрэглэгч өдөрт 15 удаа simulator
                ажиллуулж болно. Шөнө 00:00-д тоолуур reset хийгдэнэ.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <h3 className="font-semibold mb-2">Free хэрэглэгч юу хийж болох вэ?</h3>
              <p className="text-muted-foreground text-sm">
                Dashboard, Signals харах боломжтой. Гэхдээ Scanner, Simulator,
                Strategy үүсгэх зэрэг идэвхтэй үйлдлүүд хийх боломжгүй.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Асуулт байна уу?
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61575073653581"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Facebook хуудсаар холбогдоорой
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 JKM Copilot. Бүх эрх хуулиар хамгаалагдсан.
        </div>
      </footer>
    </div>
  )
}
