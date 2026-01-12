"use client"

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
            Setup олох
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Why / Why-not
          </Badge>
        </div>

        <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Өөрийн дүрмээрээ зах зээлийг 24/7 шалга.
        </h1>

        <p className="mb-10 text-pretty text-lg text-muted-foreground md:text-xl">
          JKM AI Trading Bot нь таны оруулсан нөхцлийг 5 минут тутам шалгаад, setup таарвал "SETUP FOUND" гэж мэдэгдэнэ.
          BUY/SELL тулгадаггүй — зөвхөн setup-ийн evidence хартуулна.
        </p>
      </div>
    </section>
  )
}
