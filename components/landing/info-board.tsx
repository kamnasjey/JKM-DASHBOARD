import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Bot, Brain, Shield } from "lucide-react"

export function InfoBoard() {
  return (
    <section id="features" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Технологийн давуу тал</h2>
        <p className="text-lg text-muted-foreground">
          Жинхэнэ зах зээлийн дата + Таны стратеги = Автомат setup илрүүлэгч
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Бодит зах зээлийн дата</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Гуравдагч эх сурвалжаас-оос 5 минут тутам тасралтгүй татаж, өөрийн market data сантай. 15+ валютын хос + Crypto.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">24/7 Автомат Bot</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Таны стратегиар зах зээлийг тасралтгүй scan хийж, нөхцөл таарахад Telegram + Web-ээр мэдэгдэнэ.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Таны стратеги</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            30+ detector-оос сонгож өөрийн арга барилыг бүтээнэ. BOS, FVG, Order Block, CHoCH гэх мэт.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Тайлбар + Нотолгоо</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Setup бүрийн "яагаад" тайлбартай. Та харж, дүн шинжилгээ хийж, өөрөө шийдвэр гаргана.
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
