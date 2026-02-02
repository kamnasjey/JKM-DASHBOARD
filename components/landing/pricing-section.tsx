import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import Link from "next/link"

export function PricingSection() {
  const comparison = [
    {
      feature: "BUY/SELL setup",
      jkm: true,
      others: true,
    },
    {
      feature: '"Яагаад" гэдгийг тайлбарлах',
      jkm: true,
      others: false,
      highlight: true,
    },
    {
      feature: "Алдсан шалтгаан харуулах (fail_reason)",
      jkm: true,
      others: false,
      highlight: true,
    },
    {
      feature: "Regime-aware (Trend/Range/Chop)",
      jkm: true,
      others: false,
      highlight: true,
    },
    {
      feature: "Price-action logic (indicator-гүй)",
      jkm: true,
      others: false,
      highlight: true,
    },
    {
      feature: "Трейдер болгож хөгжүүлэх",
      jkm: true,
      others: false,
      highlight: true,
    },
  ]

  return (
    <section id="pricing" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">JKM vs Бусад Bot-ууд</h2>
        <p className="text-lg text-muted-foreground">Үнэхээр юугаараа ялгаатай вэ?</p>
      </div>

      {/* Comparison Table */}
      <div className="mx-auto mb-16 max-w-3xl overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur">
        <div className="grid grid-cols-3 gap-px bg-border/20">
          {/* Header */}
          <div className="bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground">Онцлог</p>
          </div>
          <div className="bg-primary/10 p-4 text-center">
            <p className="font-bold text-primary">JKM AI</p>
          </div>
          <div className="bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Бусад bot-ууд</p>
          </div>

          {/* Features */}
          {comparison.map((item, idx) => (
            <>
              <div
                key={`feature-${idx}`}
                className={`bg-background p-4 ${item.highlight ? "border-l-2 border-primary/50" : ""}`}
              >
                <p className={`text-sm ${item.highlight ? "font-medium" : ""}`}>{item.feature}</p>
              </div>
              <div key={`jkm-${idx}`} className={`bg-primary/5 p-4 ${item.highlight ? "border-primary/20" : ""}`}>
                <div className="flex justify-center">
                  {item.jkm ? <Check className="h-5 w-5 text-green-400" /> : <X className="h-5 w-5 text-red-400" />}
                </div>
              </div>
              <div key={`others-${idx}`} className="bg-background p-4">
                <div className="flex justify-center">
                  {item.others ? (
                    <Check className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
              </div>
            </>
          ))}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mb-8 text-center">
        <h3 className="mb-4 text-2xl font-bold">Үнийн төлөвлөгөө</h3>
        <p className="text-muted-foreground">Өөрт тохирохыг сонгоорой</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <Card className="relative rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>Анхлан суралцагчдад</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">₮0</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3">
              {["Өдөрт 5 setup", "Үндсэн тайлбар", "Эрсдэлийн зөвлөмж", "Community дэмжлэг"].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-transparent" variant="outline" asChild>
              <Link href="/auth/register">Эхлэх</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="relative rounded-2xl border-primary/50 bg-card/50 shadow-lg shadow-primary/10 backdrop-blur">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium">
            Popular
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription>Идэвхтэй трэйдэрүүдэд</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">₮50,000</span>
              <span className="text-muted-foreground">/сар</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3">
              {[
                "Хязгааргүй setup",
                "Дэлгэрэнгүй AI тайлбар",
                "Advanced эрсдэл менежмент",
                "Chart тэмдэглэл + Replay",
                "Журнал + Статистик",
                "Priority дэмжлэг",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full" asChild>
              <Link href="/auth/register">Upgrade (Удахгүй)</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
