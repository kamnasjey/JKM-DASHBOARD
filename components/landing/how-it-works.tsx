import { Card, CardContent } from "@/components/ui/card"
import { FileEdit, Radio, Target, MessageSquare, LineChart } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Нөхцөлөө тодорхойлох",
      description:
        "Setup-аа ямар үед гэж үздэгээ бичнэ: бүтэц, zone, invalidation, RR гэх мэт шалгуурууд. Жишээ нь: 'EMA 9-20 cross болоод support зураглал дээр буцаж давхцсан байх'.",
      icon: FileEdit,
    },
    {
      number: "02",
      title: "JKM Bot давтамжтай шалгана",
      description: "Зах зээлийг (жишээ нь: 5 минут тутам) scan хийж, таны оруулсан нөхцөл таарч байгаа эсэхийг хянана.",
      icon: Radio,
    },
    {
      number: "03",
      title: "Setup таарвал SETUP FOUND гэж гаргана",
      description:
        "JKM нь BUY/SELL тулгахгүй. Setup-ийн зураглал, invalidation бүс, RR зэрэг шийдвэр гаргахад хэрэгтэй мэдээллийг цэгцэлж харуулна.",
      icon: Target,
    },
    {
      number: "04",
      title: "Why / Why-not харуулна",
      description:
        "Setup таарсан эсвэл таараагүй шалтгааныг товч, ойлгомжтой тэмдэглэнэ: юу нь дутуу байв (fail_reason), юугаар нотолж байна (evidence).",
      icon: MessageSquare,
    },
    {
      number: "05",
      title: "Backtest болон Review",
      description: "Арга барилаа өнгөрсөн өгөгдөл дээр шалгаад, үр дүнгээ харан засварлаж сайжруулна.",
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
