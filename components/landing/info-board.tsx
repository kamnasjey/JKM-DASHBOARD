import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, FileEdit, MessageSquare } from "lucide-react"

export function InfoBoard() {
  return (
    <section id="features" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Яагаад JKMCOPILOT вэ?</h2>
        <p className="text-lg text-muted-foreground">Сигнал биш — таны дүрмээр setup илрүүлэх туслах.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              <CardTitle>Таны дүрэм, таны арга</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Дүрмээ өөрөө тодорхойлоод, яг тэр нөхцлөөр нь зах зээлийг тогтмол скан хийлгэнэ.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle>Setups, not signals</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            BUY/SELL тулгахгүй. Зөвхөн setup олдсон эсэхийг, “SETUP FOUND” гэж ойлгомжтой харуулна.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Яагаад / Яагаад биш — нотолгоотой</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fail reason + evidence лог дээр тулгуурлан ойлгомжтой тайлбарлана.
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
