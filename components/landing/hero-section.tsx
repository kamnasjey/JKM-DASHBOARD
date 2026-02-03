"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  const scrollToHow = () => {
    const element = document.getElementById("how")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            5 мин тутам Live Data
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            24/7 Автомат Scan
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Таны стратеги
          </Badge>
        </div>

        <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Таны хувийн Trading Copilot
        </h1>

        <p className="mb-6 text-pretty text-lg text-muted-foreground md:text-xl">
          Гуравдагч эх сурвалжаас-оос 5 минут тутам шинэчлэгдэх жинхэнэ зах зээлийн дата дээр
          <span className="text-primary font-medium"> таны өөрийн стратегиар </span>
          24/7 автоматаар scan хийж, оновчтой setup-уудыг илрүүлнэ.
        </p>

        <p className="mb-10 text-pretty text-base text-muted-foreground/80">
          Энэ нь trader-ийг орлохгүй — таны өдөр тутмын ажлыг хөнгөвчилж, илүү сахилга баттай,
          оновчтой арилжаа хийхэд туслах хэрэгсэл юм. Та setup-ийг харж, өөрөө дүн шинжилгээ хийнэ.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/auth/register">Эхлэх</Link>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={scrollToHow}>
            Яаж ажилладаг вэ?
          </Button>
        </div>
      </div>
    </section>
  )
}
