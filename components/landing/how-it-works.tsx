import { Card, CardContent } from "@/components/ui/card"
import { FileEdit, Radio, Target, MessageSquare, LineChart } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Арга барилаа оруулна",
      description: "Setup-аа ямар үед гэж үздэгээ бичнэ: бүтэц, zone, invalidation, RR гэх мэт шалгуурууд.",
      icon: FileEdit,
    },
    {
      number: "02",
      title: "24/7 давтамжтай scan",
      description: "Зах зээлийг (жишээ нь: 5 минут тутам) шалгаж, таны нөхцөл таарч байгаа эсэхийг хянана.",
      icon: Radio,
    },
    {
      number: "03",
      title: "Setup таарвал — боломж гэж гаргана",
      description:
        "JKM нь BUY/SELL тулгахгүй. Setup-ийн зураглал, invalidation бүс, RR зэрэг шийдвэр гаргахад хэрэгтэй мэдээллийг цэгцэлж харуулна.",
      icon: Target,
      example: "BTCUSDT • 5m • SETUP FOUND",
    },
    {
      number: "04",
      title: "Why / Why-not (fail_reason + evidence)",
      description:
        "Таарсан эсвэл таараагүй шалтгааныг товч, ойлгомжтой тэмдэглэнэ: юу нь дутуу байв (fail_reason), юугаар нотолж байна (evidence).",
      icon: MessageSquare,
      example: "fail_reason = 'confirmation дутуу' • evidence = 'zone байгаа ч close батлаагүй'",
    },
    {
      number: "05",
      title: "Backtest + review",
      description: "Арга барилаа өнгөрсөн өгөг дээр шалгаад, үр дүнгээ харан засварлаж сайжруулна.",
      icon: LineChart,
    },
  ]

  return (
    <section id="how" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Яаж ажилладаг вэ?</h2>
        <p className="text-lg text-muted-foreground">
          Та нөхцлөө оруулна. JKM нь түүнийг 24/7 давтамжтай шалгаж, setup-ийг ойлгомжтой байдлаар харуулна.
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <Card key={idx} className="relative rounded-2xl border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="text-5xl font-bold text-primary/20">{step.number}</div>
                  <div className="rounded-full bg-primary/20 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
                <p className="text-pretty text-sm text-muted-foreground">{step.description}</p>
                {step.example && <p className="mt-2 text-xs text-muted-foreground/60">Жишээ: {step.example}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          ⚠️ Санхүүгийн зөвлөгөө биш. Эцсийн шийдвэрийг хэрэглэгч өөрөө гаргана.
        </p>
      </div>
    </section>
  )
}
