import { Card, CardContent } from "@/components/ui/card"
import { FileEdit, Radio, Target, MessageSquare, LineChart } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Стратегиа бүтээ",
      description:
        "30+ detector-оос сонгож өөрийн арга барилыг тохируулна: Gate (шүүлтүүр), Trigger (оролтын дохио), Confluence (баталгаа).",
      icon: FileEdit,
    },
    {
      number: "02",
      title: "Bot тасралтгүй ажиллана",
      description: "Гуравдагч эх сурвалжаас-оос 5 минут тутам бодит дата татаж, таны стратегиар 15+ валютын хосыг 24/7 scan хийнэ.",
      icon: Radio,
    },
    {
      number: "03",
      title: "Setup илэрвэл мэдэгдэнэ",
      description:
        "Таны нөхцөл таарахад Telegram + Web дээр мэдэгдэл ирнэ. Entry, SL, TP, RR бүгд тооцоолсон байна.",
      icon: Target,
    },
    {
      number: "04",
      title: "Тайлбартай, нотолгоотой",
      description:
        "Setup бүр яагаад trigger болсон, ямар detector-ууд ажилласныг тайлбарлана. Та харж, өөрөө шийдвэр гаргана.",
      icon: MessageSquare,
    },
    {
      number: "05",
      title: "Simulator-ээр шалга",
      description: "Стратегиа өнгөрсөн дата дээр туршиж, win rate болон үр дүнг урьдчилан харна.",
      icon: LineChart,
    },
  ]

  return (
    <section id="how" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Яаж ажилладаг вэ?</h2>
        <p className="text-lg text-muted-foreground">
          5 алхамтай энгийн процесс — та нөхцлөө оруулна, JKM нь 24/7 шалгаад таарвал мэдэгдэнэ.
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <Card
              key={idx}
              className={`relative rounded-2xl border-border/50 bg-card/50 backdrop-blur ${idx === 4 ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="text-5xl font-bold text-primary/20">{step.number}</div>
                  <div className="rounded-full bg-primary/20 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
                <p className="text-pretty text-sm text-muted-foreground">{step.description}</p>
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
