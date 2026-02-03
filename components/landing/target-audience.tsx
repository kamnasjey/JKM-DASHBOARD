import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Target, Users } from "lucide-react"

export function TargetAudience() {
  const audiences = [
    {
      icon: AlertCircle,
      title: "Анхлан суралцаж байгаа trader-үүдэд",
      description:
        "Сахилга баттай арилжааны дадал эзэмших, оновчтой setup илрүүлж сурахад туслана. Bot тань chart харж байхгүй үед ч ажиллана.",
      color: "text-green-400",
    },
    {
      icon: TrendingUp,
      title: "Өдөр тутмын скан хийхэд цаг дутагдаж байвал",
      description:
        "Ажил амьдралтайгаа зэрэгцүүлж арилжаа хийдэг хүмүүст. Bot 24/7 хянаж, таарсан setup байвал мэдэгдэнэ.",
      color: "text-yellow-400",
    },
    {
      icon: Target,
      title: "Өөрийн арга барилаа системчлэх хүсэлтэй",
      description:
        "Зүгээр л сохроор сигнал дагахгүй, өөрийн стратегиа бүтээж, түүгээрээ автоматаар скан хийлгэхийг хүсвэл.",
      color: "text-blue-400",
    },
    {
      icon: Users,
      title: "Тайлбар, нотолгоотой setup хүсвэл",
      description:
        "BUY/SELL гэж хэлээд орхидог биш. Яагаад энэ setup гэдгийг тайлбарлаж, та өөрөө дүн шинжилгээ хийх боломжтой.",
      color: "text-primary",
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
          JKM Copilot бол таны оронд trade хийдэг бот биш.
          <br />
          <span className="text-primary">Таны ажлыг хөнгөвчилж, илүү сайн trader болоход туслах хэрэгсэл юм.</span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Бодит дата + Таны стратеги + 24/7 автомат скан = Илүү оновчтой setup, илүү сахилга баттай арилжаа
        </p>
      </div>
    </section>
  )
}
