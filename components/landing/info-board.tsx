import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Shield, BarChart3, Activity, CheckCircle2 } from "lucide-react"

export function InfoBoard() {
  return (
    <section id="features" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">JKM Trading AI Bot — Яагаад илүү вэ?</h2>
        <p className="text-lg text-muted-foreground">"Signal зардаг бот" биш, зах зээлийг тайлбарладаг engine</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Market Understanding */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>Зах зээлийг ойлгодог</CardTitle>
            </div>
            <CardDescription>Зөвхөн rule биелүүлдэггүй</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              JKM нь IF-THEN rule-ийг автоматжуулдаггүй. Харин зах зээлийн бүтэц (market structure), regime, liquidity-г
              бодитоор уншиж, setup-ийг олно.
            </p>
            <div className="flex flex-wrap gap-1">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">HH/HL</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Zone</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">RR</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Confluence</span>
            </div>
          </CardContent>
        </Card>

        {/* Explanation Power */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle>"Яагаад" гэдгийг тайлбарлана</CardTitle>
            </div>
            <CardDescription>Trade гарсан ч, гараагүй ч</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              JKM нь trade гарсан/гараагүй шалтгааныг (fail_reason + evidence) 1 мөр лог дээр тодорхой харуулдаг.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Аль хэсэг нь буруу байсныг харуулна</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Дараагийн алхамд яаж сайжруулах</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Мөнгө төдийгүй ойлголт өгнө</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Regime Aware */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Зах зээлд дасан зохицдог</CardTitle>
            </div>
            <CardDescription>Regime-aware engine</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              Trend, Range, Chop үед нэг strategy-г хүчээр ажиллуулахгүй. Regime өөрчлөгдвөл логик өөрчлөгдөнө.
            </p>
            <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="flex justify-between text-xs">
                <span>Trend үед:</span>
                <span className="text-green-400">Breakout</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Range үед:</span>
                <span className="text-blue-400">Mean reversion</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Chop үед:</span>
                <span className="text-yellow-400">Хүлээх</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Action */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Price-action intelligence</CardTitle>
            </div>
            <CardDescription>Indicator-оос хамааралгүй</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              JKM нь RSI, MACD гэх мэт indicator-т баригдахгүй. Үнэ өөрөө юу хэлж байгааг уншдаг — энэ бол мэргэжлийн
              Forex трейдерүүдийн жинхэнэ логик.
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-red-400">✕</span>
                <span className="line-through opacity-60">RSI, MACD, Stochastic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>HH/HL/LH/LL, Support/Resistance, Zone</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Makes You Stronger */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Хараат болгодоггүй</CardTitle>
            </div>
            <CardDescription>Хүчирхэг болгодог</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              JKM нь "надад л итгэ" гэдэггүй. Харин таныг өөрөө дүгнэлт хийх чадвартай болгоно — энэ бол bот + сургалт +
              анализ нэгдсэн систем.
            </p>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="font-medium text-primary">Copy-trading-оос залхсан хүмүүст</p>
            </div>
          </CardContent>
        </Card>

        {/* Long-term Vision */}
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Урт хугацааны систем</CardTitle>
            </div>
            <CardDescription>Экосистемийн эхлэл</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              JKM нь market-д дасан зохицдог. Strategy-г хатуу тогтоохгүй. Ирээдүйд: Strategy marketplace, Pro profiles,
              Fund-level logic.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded bg-primary/20 px-2 py-1 font-medium text-primary">Full Trading OS</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
