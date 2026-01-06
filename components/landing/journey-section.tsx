import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trophy, Target, Sparkles } from "lucide-react"

export function JourneySection() {
  const stages = [
    {
      title: "Beginner",
      icon: Sparkles,
      color: "text-blue-400",
      learns: ["RR, SL/TP ойлгох", "Сахилга бат тогтоох", "Эрсдэл хэмжээ тооцох", "Анхны арилжаа хийх"],
    },
    {
      title: "Intermediate",
      icon: Target,
      color: "text-purple-400",
      learns: ["Стратеги сонгох", "Журнал хөтлөх", "Давталт тогтоох", "Технический дүн шинжилгээ"],
    },
    {
      title: "Pro",
      icon: Trophy,
      color: "text-yellow-400",
      learns: ["Систем бүтээх", "Position sizing", "Эрсдэлийн менежмент", "Тогтвортой ашиг"],
    },
  ]

  return (
    <section id="journey" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Трейдэр замнал</h2>
        <p className="text-lg text-muted-foreground">Анхлан суралцагчаас мэргэжлийн трэйдэр болох замнал</p>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon
          return (
            <Card key={idx} className="relative rounded-2xl border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="mb-2 flex items-center gap-3">
                  <div className={`rounded-full bg-background/50 p-2 ${stage.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className={stage.color}>{stage.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm font-medium text-muted-foreground">Юу сурах вэ?</div>
                <ul className="space-y-2 text-sm">
                  {stage.learns.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {idx < stages.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-muted-foreground/50 md:block">
                  →
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <Button size="lg" asChild>
          <Link href="/auth/register">Замнал эхлүүлэх</Link>
        </Button>
      </div>
    </section>
  )
}
