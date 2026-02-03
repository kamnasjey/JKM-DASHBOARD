import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BrandStory() {
  return (
    <section id="about" className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Бидний зорилго</h2>
          <p className="text-lg text-muted-foreground">
            Trader-уудын өдөр тутмын ажлыг хөнгөвчилж, илүү сахилга баттай trader болгох
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>JKM = Just Keep Moving</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground md:text-base">
              <p>
                Зах зээл 24/7 хөдөлж байдаг учраас бид ч мөн тасралтгүй хянаж ажиллана.
                Таны оронд унтаж байхад ч bot таны стратегиар scan хийсээр байна.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>COPILOT = Хамтрагч</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground md:text-base">
              <p>
                Таны оронд шийдэх биш — таныг илүү сайн шийдвэр гаргахад туслах.
                Setup олоод өгнө, тайлбарлана. Эцсийн шийдвэр таных.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-base md:text-lg">
            <span className="font-semibold text-primary">Манай хамгийн чухал зорилго:</span>
            {" "}Анхлан суралцагчдад илүү сахилга баттай, сайн trader болоход туслах
          </p>
        </div>
      </div>
    </section>
  )
}
