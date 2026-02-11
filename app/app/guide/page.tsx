"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BookOpen,
  Rocket,
  Brain,
  Scan,
  BarChart3,
  Send,
  UserCog,
  HelpCircle,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react"

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 my-3 space-y-1">
      <p className="font-medium text-blue-400 flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5" />
        Зөвлөгөө
      </p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 my-3 space-y-1">
      <p className="font-medium text-yellow-400 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Анхааруулга
      </p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
        {n}
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </div>
  )
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <p className="text-xs text-muted-foreground mt-0.5">{children}</p>
    </div>
  )
}

export default function GuidePage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" />
            Хэрэглэгчийн заавар
          </h1>
          <p className="text-muted-foreground text-sm">
            JKM AI Trading System-ийн бүх функцийг ойлгох гарын авлага
          </p>
        </div>

        {/* Main content */}
        <Accordion type="multiple" defaultValue={["getting-started"]} className="space-y-3">

          {/* ═══════════════ 1. GETTING STARTED ═══════════════ */}
          <AccordionItem value="getting-started" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Эхлэх
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Системийг ашиглахын тулд дараах 4 алхмыг дагана уу:
              </p>

              <Step n={1}>
                <strong>Бүртгэл</strong> — Google эсвэл email-ээр нэвтрэх.
                Бүртгэлийн дараа автоматаар profile үүснэ.
              </Step>
              <Step n={2}>
                <strong>Profile тохиргоо</strong> — <em>Тохиргоо</em> хуудаснаас
                min_rr (доод R:R), min_score (доод confidence) утгуудыг тохируулна.
              </Step>
              <Step n={3}>
                <strong>Strategy сонгох</strong> — Бэлэн стратеги (SMC Trend, All-Weather г.м.)
                сонгох, эсвэл өөрийн detector-ууд нэгтгэж шинэ стратеги үүсгэх.
              </Step>
              <Step n={4}>
                <strong>Scan идэвхжүүлэх</strong> — Тохиргоо хуудаснаас &quot;Scan enabled&quot;
                идэвхжүүлснээр систем 5 минут тутам зах зээлийг шалгаж, Telegram-аар дохио илгээнэ.
              </Step>

              <Tip>
                Эхлэх үед All-Weather стратеги сонгоход тохиромжтой — бүх зах зээлийн
                нөхцөлд (trend, range, transition) ажилладаг.
              </Tip>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 2. STRATEGY ═══════════════ */}
          <AccordionItem value="strategy" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Стратеги
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Стратеги гэдэг нь detector-уудын хослол юм. Detector бүр зах зээлийн
                тодорхой дохио хайдаг.
              </p>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detector-ийн 3 төрөл</CardTitle>
                </CardHeader>
                <CardContent>
                  <Term label="Trigger (Гол дохио)">
                    Entry цэг олдог detector. Жишээ: BOS (Break of Structure), FVG (Fair Value Gap),
                    OB (Order Block), CHOCH, SR_BOUNCE, BREAKOUT_RETEST г.м.
                  </Term>
                  <Term label="Gate (Шүүлтүүр)">
                    Зах зээлийн нөхцөл шалгадаг. GATE_REGIME (trend/range тодорхойлох),
                    GATE_VOLATILITY (хэт хэлбэлзэлтэй үед блоклох).
                  </Term>
                  <Term label="Confluence (Баталгаажуулалт)">
                    Нэмэлт баталгаа. ENGULF_AT_LEVEL, PINBAR_AT_LEVEL, FIBO_RETRACE г.м.
                    Trigger-тэй хослохоор score нэмэгддэг.
                  </Term>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detector Family (Гэр бүл)</CardTitle>
                  <CardDescription>
                    Detector бүр нэг &quot;гэр бүл&quot;-д хамаарна. Стратеги дор хаяж 2
                    өөр гэр бүлээс detector тохирсон байх ёстой (confluence).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted/50 p-2"><strong>Structure</strong> — BOS, CHOCH, EQ_BREAK</div>
                  <div className="rounded bg-muted/50 p-2"><strong>Range/SR</strong> — SR_BOUNCE, SR_BREAK_CLOSE</div>
                  <div className="rounded bg-muted/50 p-2"><strong>Momentum</strong> — MOMENTUM_CONT, COMPRESSION</div>
                  <div className="rounded bg-muted/50 p-2"><strong>Pattern</strong> — ENGULF, PINBAR, DOJI</div>
                  <div className="rounded bg-muted/50 p-2"><strong>Fibo</strong> — FIBO_RETRACE, FIBO_EXTENSION</div>
                  <div className="rounded bg-muted/50 p-2"><strong>Geometry</strong> — TRIANGLE, FLAG, HEAD_SHOULDERS</div>
                </CardContent>
              </Card>

              <Tip>
                2+ гэр бүлээс detector тохирсон үед confluence bonus (+0.25) нэмэгддэг.
                Энэ нь score-г ихэсгэж, илүү найдвартай дохио гаргадаг.
              </Tip>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Бэлэн стратегиуд</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <strong>SMC Trend</strong>
                    <span>Structure + Zone. Trend зах зээлд тохиромжтой. min_rr=2.5</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <strong>Range Bounce</strong>
                    <span>Zone + Pattern. Range зах зээлд. min_rr=2.5, min_score=0.6</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <strong>Breakout Momentum</strong>
                    <span>Breakout + Momentum хослол. min_rr=2.5</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 py-1.5">
                    <strong>Reversal</strong>
                    <span>CHOCH + Double Top/Bottom. Маш сонгомол. min_rr=3.5, min_score=0.7</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <strong>All-Weather</strong>
                    <span>Бүх нөхцөлд ажилладаг. min_rr=2.5, min_score=0.55</span>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 3. SCANNER ═══════════════ */}
          <AccordionItem value="scanner" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-cyan-400" />
                Сканнер (Live Scanning)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Сканнер нь 5 минут тутам 15 валют хосыг шалгаж, таны стратегийн
                дохио олдвол Telegram-аар мэдэгдэл илгээнэ.
              </p>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ажиллах дараалал</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <ChevronRight className="h-3 w-3 text-primary" />
                    Symbol бүр дээр бүх detector-ууд ажиллана
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <ChevronRight className="h-3 w-3 text-primary" />
                    Detector бүрийн score тооцогдоно (weight + confluence bonus)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <ChevronRight className="h-3 w-3 text-primary" />
                    Score &ge; min_score шалгана (confidence threshold)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <ChevronRight className="h-3 w-3 text-primary" />
                    Entry, SL, TP тооцогдоно. RR &ge; min_rr шалгана
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <ChevronRight className="h-3 w-3 text-primary" />
                    Бүх шүүлтүүр давсан бол Telegram дохио илгээнэ
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Score тооцоолол</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Score = <strong>Detector weight + Confluence bonus - Correlation discount</strong></p>
                  <Term label="Detector weight">
                    Detector бүр 0.0-1.0 хооронд score_contrib өгнө. Detector-ийн weight-ээр үржүүлнэ.
                  </Term>
                  <Term label="Confluence bonus (+0.25)">
                    2 өөр detector family (жнь Structure + Momentum) нэг чиглэлд тохирвол +0.25 нэмэгдэнэ.
                    3 family бол +0.50.
                  </Term>
                  <Term label="Correlation discount">
                    Ижил төстэй detector хос (жнь SR_BOUNCE + SR_BREAK) хоёулаа тохирвол
                    давхардлыг хасна (0.25-0.50).
                  </Term>
                </CardContent>
              </Card>

              <Tip>
                Сканнер ажиллахын тулд: (1) Scan enabled идэвхтэй, (2) Strategy сонгосон,
                (3) Telegram холбогдсон байх шаардлагатай.
              </Tip>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 4. SIMULATOR ═══════════════ */}
          <AccordionItem value="simulator" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                Симулятор (Backtest)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Стратегийн өнгөрсөн үеийн гүйцэтгэлийг шалгах хэрэгсэл.
                Түүхэн дата дээр detector-ууд яаж ажилласныг харуулна.
              </p>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Backtest хийх</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Step n={1}>Strategy сонгоно (detector-ууд автоматаар ачаалагдана)</Step>
                  <Step n={2}>Огнооны хүрээ сонгоно (7-30 хоног зөвлөмж)</Step>
                  <Step n={3}>Symbol сонгоно (нэг эсвэл олон)</Step>
                  <Step n={4}>&quot;Run&quot; товч дарна → Multi-TF (5m, 15m, 30m, 1h, 4h) нэгтгэсэн үр дүн</Step>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Үр дүнг ойлгох</CardTitle>
                </CardHeader>
                <CardContent>
                  <Term label="Entries (Нийт trade)">
                    Нээгдсэн нийт позицийн тоо. Олон detector = олон entry.
                  </Term>
                  <Term label="Win Rate (%)">
                    TP хүрсэн trade-ийн хувь. 30-45% нь R:R 2.5+ үед сайн.
                  </Term>
                  <Term label="Profit R (Нийт R)">
                    Бүх trade-ийн нийт R. Жишээ: +15R гэвэл нийт 15 удаа эрсдэлийн
                    хэмжээтэй тэнцэх ашиг олсон.
                  </Term>
                  <Term label="Avg R (Дундаж R)">
                    Trade тус бүрийн дундаж R. 0.3+ бол сайн.
                  </Term>
                </CardContent>
              </Card>

              <Warning>
                M5 timeframe дээр 30+ хоног backtest хийвэл удаан байж болно.
                7-14 хоног эхлэхэд тохиромжтой.
              </Warning>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 5. TELEGRAM ═══════════════ */}
          <AccordionItem value="telegram" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                Telegram дохио
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Сканнер дохио олдвол Telegram-аар шууд мэдэгдэл илгээнэ.
              </p>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Холболт хийх (Нэг товч)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Step n={1}>Dashboard-ийн <strong>Профайл</strong> хуудас руу орно</Step>
                  <Step n={2}><strong>&quot;Telegram холбох&quot;</strong> товч дарна → Telegram автоматаар нээгдэнэ</Step>
                  <Step n={3}>Telegram дээр <strong>Start</strong> товч дарна → автоматаар холбогдоно</Step>
                  <Step n={4}>Dashboard руу буцвал <strong>&quot;Идэвхтэй&quot;</strong> гэж харагдана</Step>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Дохионы формат</CardTitle>
                </CardHeader>
                <CardContent className="text-xs">
                  <div className="bg-muted/50 rounded-lg p-3 font-mono space-y-0.5">
                    <div className="text-green-400 font-bold">BUY EURJPY</div>
                    <div>Entry: 185.250</div>
                    <div>SL: 184.800 | TP: 186.375</div>
                    <div>RR: 2.50 | Score: 0.72</div>
                    <div>Detectors: BOS + FIBO_RETRACE</div>
                    <div className="text-muted-foreground">Strategy: SMC Trend | TF: H1</div>
                  </div>
                </CardContent>
              </Card>

              <Tip>
                Дохио авсны дараа заавал өөрийн chart дээр шалгаж, зөвхөн өөрийн
                дүрмээр trade нээнэ. AI дохио нь туслах хэрэгсэл — эцсийн шийдвэр таных.
              </Tip>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 6. PROFILE SETTINGS ═══════════════ */}
          <AccordionItem value="profile" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-orange-400" />
                Profile тохиргоо
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    min_rr (Minimum Risk:Reward)
                  </CardTitle>
                  <CardDescription>
                    TP (Take Profit) байрлуулалтын доод хязгаар
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Жишээ: min_rr=2.5 гэвэл SL 50 pip бол TP дор хаяж 125 pip-д байрлана.
                    Detector-ийн TP min_rr-ээс бага бол автоматаар тэлэгдэнэ.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="rounded bg-muted/50 p-2 text-center">
                      <div className="font-bold text-foreground">2.0</div>
                      <div>Бага шүүлт, олон дохио</div>
                    </div>
                    <div className="rounded bg-primary/10 border border-primary/30 p-2 text-center">
                      <div className="font-bold text-primary">2.5</div>
                      <div>Тэнцвэртэй (зөвлөмж)</div>
                    </div>
                    <div className="rounded bg-muted/50 p-2 text-center">
                      <div className="font-bold text-foreground">3.0+</div>
                      <div>Сонгомол, цөөн дохио</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    min_score (Minimum Confidence)
                  </CardTitle>
                  <CardDescription>
                    Setup-ийн итгэлийн доод хязгаар (0.0 - 1.0)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Score нь detector-уудын нэгтгэсэн итгэлийн оноо. 2+ detector family
                    тохирсон бол confluence bonus нэмэгдэнэ.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="rounded bg-muted/50 p-2 text-center">
                      <div className="font-bold text-foreground">0.3</div>
                      <div>Олон дохио, хуурамч их</div>
                    </div>
                    <div className="rounded bg-primary/10 border border-primary/30 p-2 text-center">
                      <div className="font-bold text-primary">0.5-0.6</div>
                      <div>Тэнцвэртэй (зөвлөмж)</div>
                    </div>
                    <div className="rounded bg-muted/50 p-2 text-center">
                      <div className="font-bold text-foreground">0.7+</div>
                      <div>Маш найдвартай, цөөн</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Warning>
                min_rr болон min_score хоёуланг нь хэт өндөр болговол дохио маш цөөн
                олдоно. Эхлэхдээ min_rr=2.5, min_score=0.5 зөвлөмжтэй.
              </Warning>
            </AccordionContent>
          </AccordionItem>

          {/* ═══════════════ 7. FAQ ═══════════════ */}
          <AccordionItem value="faq" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-rose-400" />
                Түгээмэл асуулт (FAQ)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Card className="bg-card/50">
                <CardContent className="pt-4 space-y-4">
                  <Term label="Симулятор 0 entries гаргаж байна?">
                    Шалтгаанууд: (1) Сонгосон огнооны хүрээ хэт богино — 7+ хоног сонгоно уу.
                    (2) Тухайн symbol дээр detector дохио олдоогүй — өөр symbol туршаарай.
                    (3) min_rr хэт өндөр — 2.0-2.5 болгож шалгаарай.
                  </Term>
                  <Term label="Сканнер дохио ирэхгүй байна?">
                    Шалтгаанууд: (1) Тохиргоо хуудаснаас &quot;Scan enabled&quot; шалгана уу.
                    (2) Strategy сонгосон эсэх. (3) Telegram холбогдсон эсэх.
                    (4) Зах зээл хаалттай (амралтын өдөр) бол дохио олдохгүй.
                  </Term>
                  <Term label="WinRate бага байна?">
                    (1) min_score нэмэгдүүлнэ (0.5 → 0.6) — илүү найдвартай дохио.
                    (2) min_rr бууруулна (3.0 → 2.5) — TP ойр байх тул хүрэх магадлал нэмэгдэнэ.
                    (3) Илүү олон detector-тэй strategy сонгоно — confluence сайжирна.
                  </Term>
                  <Term label="RR муу байна?">
                    Profile-д min_rr утгаа нэмэгдүүлнэ. Жишээ: 2.0 → 2.5 болговол
                    TP автоматаар илүү хол байрлана. Гэхдээ winRate буурч болно.
                  </Term>
                  <Term label="Аль strategy хамгийн сайн бэ?">
                    Зах зээлээс хамаарна. Trend зах зээлд SMC Trend, хажуу (range) зах зээлд
                    Range Bounce, эргэлт (reversal) дээр Reversal стратеги илүү тохиромжтой.
                    Итгэлгүй бол All-Weather сонгоорой.
                  </Term>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </DashboardLayout>
  )
}
