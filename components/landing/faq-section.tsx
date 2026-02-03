import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  const faqs = [
    {
      q: "Зах зээлийн дата хаанаас авдаг вэ?",
      a: "Polygon.io-оос 5 минут тутам тасралтгүй татаж, өөрсдийн серверт хадгалдаг. Энэ нь жинхэнэ зах зээлийн дата бөгөөд 15+ Forex хос + XAUUSD, BTCUSD зэрэг дэмждэг.",
    },
    {
      q: "Энэ 100% trader-ийг орлох уу?",
      a: "Үгүй. JKM Copilot нь таны стратегиар оновчтой setup олоход туслах хэрэгсэл. Setup олдохоор та харж, өөрөө дүн шинжилгээ хийж, шийдвэрээ гаргана. Энэ нь таны ажлыг хөнгөвчилдөг, орлодоггүй.",
    },
    {
      q: "Сигнал бүр дээр тайлбар байдаг уу?",
      a: "Тийм. Яагаад trigger болсон, ямар detector-ууд давсан, ямар нөхцөл таарсныг тайлбарлана. Та өөрөө дахин analyze хийх боломжтой.",
    },
    {
      q: "Хэнд зориулагдсан вэ?",
      a: "Анхлан арилжаа эхэлж байгаа хүмүүст илүү сахилга баттай, оновчтой setup илрүүлэхэд туслана. Ахисан түвшний trader-үүдэд өдөр тутмын скан хийх ажлыг хөнгөвчилнө.",
    },
    {
      q: "Санхүүгийн зөвлөгөө үү?",
      a: "Үгүй. Энэ нь санхүүгийн зөвлөгөө биш, зөвхөн техникийн хэрэгсэл юм. Эцсийн шийдвэрийг та өөрөө гаргана, хариуцлагаа өөрөө хүлээнэ.",
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
