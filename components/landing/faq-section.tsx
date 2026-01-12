import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  const faqs = [
    {
      q: "Энэ чинь сигнал өгдөг үү?",
      a: "Үгүй. JKMCOPILOT бол сигнал зардаг бот биш — таны дүрмээр setup илрүүлдэг туслах.",
    },
    {
      q: "BUY/SELL шийдвэрийг өөрөө гаргах уу?",
      a: "Үгүй. BUY/SELL тулгахгүй — зөвхөн нөхцөл таарсан эсэх, яагаад гэдгийг нотолгоотой тайлбарлаж өгнө.",
    },
    {
      q: "Ямар зах зээл дээр ажиллах вэ?",
      a: "Forex / Crypto зэрэг зах зээл дээр таны нөхцлөөр скан хийхээр бүтээгдсэн. (Хэрэв танай орчинд одоогоор бүрэн нээгдээгүй бол тун удахгүй нэмэгдэнэ.)",
    },
  ]

  return (
    <section id="faq" className="container mx-auto px-4 py-20">
      <div className="mb-10 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">FAQ</h2>
        <p className="text-lg text-muted-foreground">Түгээмэл асуултууд</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
