import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Target, Users } from "lucide-react"

export function TargetAudience() {
  const audiences = [
    {
      icon: AlertCircle,
      title: '"Signal авч ядарсан" хүмүүст',
      description:
        "Олон signal-service туршсан ч тогтвортой ашиггүй байна уу? JKM зөвхөн BUY/SELL биш, яагаад гэдгийг тайлбарлана.",
      color: "text-red-400",
    },
    {
      icon: TrendingUp,
      title: '"Яагаад алдаад байгаагаа ойлгох" хүсэлтэй',
      description:
        "Алдаж байгаа шалтгаан нь системгүй, эрсдэлгүй арилжаа юм. JKM нь таны алдааг тодорхой харуулж, сайжруулах арга зааж өгнө.",
      color: "text-yellow-400",
    },
    {
      icon: Target,
      title: "Forex-ийг мэргэжлийн түвшинд тоглох зорилготой",
      description:
        "Pro-trader болохыг хүсч байвал зах зээлийн бүтцийг ойлгох хэрэгтэй. JKM нь indicator биш price-action logic заана.",
      color: "text-green-400",
    },
    {
      icon: Users,
      title: "Copy-trading-оос залхсан хүмүүст",
      description:
        'JKM нь "надад л итгэ" гэдэггүй. Таныг бие даан шийдвэр гаргах чадвартай, хараат биш трейдер болгоно.',
      color: "text-blue-400",
    },
  ]

  return (
    <section id="target-audience" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Яг хэнд зориулагдсан бэ?</h2>
        <p className="text-lg text-muted-foreground">
          Хэрэв та эдгээр асуудлын аль нэгтэй тулгараад байвал JKM нь таны хэрэгцээнд нийцнэ
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {audiences.map((audience, idx) => {
          const Icon = audience.icon
          return (
            <Card key={idx} className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className={`rounded-full bg-background/50 p-3 ${audience.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-bold">{audience.title}</h3>
                    <p className="text-sm text-muted-foreground">{audience.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center backdrop-blur md:p-8">
        <p className="text-lg font-medium md:text-xl">
          JKM бол таны оронд trade хийдэг бот биш.
          <br />
          <span className="text-primary">Таныг илүү ухаантай трейдер болгодог AI.</span>
        </p>
      </div>
    </section>
  )
}
