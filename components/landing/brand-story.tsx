import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BrandStory() {
  return (
    <section id="about" className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">JKM гэж юу вэ? ✨</h2>
          <p className="text-lg text-muted-foreground">Брэндийн утга, зарчим, байр суурь.</p>
        </div>

        <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>JKM = Just Keep Moving</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground md:text-base">
            <p>
              JKM = Just Keep Moving. Зах зээл 24/7 хөдөлж байдаг учраас бид ч мөн тасралтгүй хянаж ажиллана.
            </p>
            <p>
              COPILOT гэдэг нь таны оронд шийдэх биш — хамт шийдэхэд туслах гэсэн санаа: дүрэм шалгана, баталгаажуулна,
              тайлбарлана. ✈️🤝
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
