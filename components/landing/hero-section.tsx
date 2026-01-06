"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            24/7 Scan
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            5 минут тутам
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Why / Why-not
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Price-action
          </Badge>
        </div>

        <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          JKM AI Trading Bot — Таны арга барилаар зах зээлийг 24/7 scan хийнэ.
        </h1>

        <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl">
          Та өөрийн арга барилын нөхцлөө оруулж өгнө. JKM нь 5 минут тутам шалгаж, тохирох setup таарсан эсэхийг танд
          гаргаж өгнө. BUY/SELL гэж шахахгүй — боломжийг л харуулна.
        </p>

        <div className="flex flex-col items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/auth/register">Эхлэх (Бүртгүүлэх)</Link>
          </Button>
          <p className="text-sm text-muted-foreground">Бүртгүүлээд шууд ашиглаж эхэлнэ.</p>
        </div>
      </div>
    </section>
  )
}
