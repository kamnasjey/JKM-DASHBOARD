"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, BookOpen, Zap, Target, BarChart3, AlertCircle, HelpCircle } from "lucide-react"

export default function DocsPage() {
  const [lang, setLang] = useState<"en" | "mn">("en")
  const t = (en: string, mn: string) => lang === "en" ? en : mn

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{t("Back", "Буцах")}</span>
            </Link>
          </div>
          <button
            onClick={() => setLang(lang === "en" ? "mn" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono"
          >
            <span className={lang === "en" ? "text-[#0df269]" : "text-gray-500"}>EN</span>
            <span className="text-gray-600">/</span>
            <span className={lang === "mn" ? "text-[#0df269]" : "text-gray-500"}>MN</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#0df269]/10 border border-[#0df269]/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0df269]" />
            </div>
            <div>
              <h1 className="text-3xl font-black">{t("Documentation", "Гарын авлага")}</h1>
              <p className="text-gray-500 text-sm">{t("Learn how to use JKM Copilot", "JKM Copilot ашиглах заавар")}</p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <section className="mb-12 p-6 rounded-xl bg-[#111111] border border-white/10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0df269]" />
            {t("What is JKM Copilot?", "JKM Copilot гэж юу вэ?")}
          </h2>
          <p className="text-gray-300 leading-relaxed">
            {t(
              "JKM Copilot is a trading copilot that scans markets and identifies potential setups using your own strategy. It helps you backtest strategies on historical data and sends you alerts when setups match your criteria.",
              "JKM Copilot нь зах зээлийг сканнердаж, таны өөрийн стратегиар боломжит setup-уудыг илрүүлдэг trading copilot юм. Стратегиа түүхэн дата дээр турших, нөхцөл таарахад мэдэгдэл авах боломжтой."
            )}
          </p>
          <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {t(
                "This is NOT automated trading. You make all final decisions yourself.",
                "Энэ нь автомат арилжаа БИШ. Эцсийн шийдвэрийг та өөрөө гаргана."
              )}
            </p>
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">{t("Getting Started", "Эхлэх")}</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: t("Sign Up / Login", "Бүртгүүлэх / Нэвтрэх"),
                desc: t("Create an account or login to access all features.", "Бүртгэл үүсгэж эсвэл нэвтэрч бүх функцэд хандана."),
              },
              {
                step: "2",
                title: t("Create a Strategy", "Стратеги үүсгэх"),
                desc: t("Select detectors (Gate, Trigger, Confluence) and configure your rules.", "Detector-ууд сонгож (Gate, Trigger, Confluence), дүрмээ тохируулна."),
              },
              {
                step: "3",
                title: t("Configure Scanner", "Сканнер тохируулах"),
                desc: t("Choose symbols, timeframes, and filters for your scan.", "Symbol, timeframe, filter сонгоно."),
              },
              {
                step: "4",
                title: t("View Signals/Setups", "Signal/Setup харах"),
                desc: t("Review detected setups with explanations: why it triggered, RR ratio, risk level.", "Илэрсэн setup-уудыг тайлбартай харна: яагаад trigger болсон, RR, эрсдэл."),
              },
              {
                step: "5",
                title: t("Analyze & Decide", "Шинжлэх & Шийдвэрлэх"),
                desc: t("You analyze the setup and make your own trading decision.", "Та өөрөө analyze хийж, арилжааны шийдвэрээ гаргана."),
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl bg-[#111111] border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-[#0df269]/10 border border-[#0df269]/20 flex items-center justify-center text-[#0df269] font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Concepts */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">{t("Key Concepts", "Гол ойлголтууд")}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Target,
                title: "Detector",
                desc: t("Technical logic blocks that identify patterns (trend, breakout, momentum, etc.)", "Техникийн логикийн блок (trend, breakout, momentum гэх мэт)"),
                color: "text-green-400",
              },
              {
                icon: BarChart3,
                title: "Strategy",
                desc: t("A combination of detectors with rules that define your trading approach.", "Detector-уудын нийлбэр дүрэм, таны арилжааны арга барил."),
                color: "text-blue-400",
              },
              {
                icon: Zap,
                title: "Scan",
                desc: t("The process of searching for setups that match your strategy conditions.", "Стратегийн нөхцөлийг хангаж буй setup хайлт."),
                color: "text-yellow-400",
              },
              {
                icon: AlertCircle,
                title: "Signal/Setup",
                desc: t("Potential trading opportunities found by the scanner. Final decision is yours.", "Боломжит арилжааны хувилбарууд. Эцсийн шийдвэр хэрэглэгч дээр."),
                color: "text-purple-400",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-[#111111] border border-white/10">
                <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#0df269]" />
            FAQ
          </h2>
          <div className="space-y-3">
            {[
              {
                q: t("Does this automatically trade for me?", "Энэ автомат арилжаа нээдэг үү?"),
                a: t("No. JKM Copilot only identifies setups. You make all trading decisions yourself.", "Үгүй. JKM Copilot зөвхөн setup илрүүлдэг. Арилжааны шийдвэрийг та өөрөө гаргана."),
              },
              {
                q: t("Is this financial advice?", "Энэ санхүүгийн зөвлөгөө юу?"),
                a: t("No. This is a technical analysis tool, not financial advice.", "Үгүй. Энэ нь техникийн анализын хэрэгсэл, санхүүгийн зөвлөгөө биш."),
              },
              {
                q: t("Why am I not getting any signals?", "Яагаад сигнал гарахгүй вэ?"),
                a: t("Your filters may be too strict, or market conditions don't match your strategy.", "Filter хэт хатуу байж болно, эсвэл зах зээлийн нөхцөл таны стратегид тохирохгүй байна."),
              },
              {
                q: t("Where does the data come from?", "Дата хаанаас ирдэг вэ?"),
                a: t("We pull real market data every 5 minutes from third-party sources.", "Гуравдагч эх сурвалжаас 5 минут тутам бодит зах зээлийн дата татдаг."),
              },
            ].map((faq, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg bg-[#111111] overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center p-4 cursor-pointer list-none hover:bg-white/5 transition-colors">
                    <span className="font-medium text-gray-200 text-sm">{faq.q}</span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-400 border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
          <h2 className="text-lg font-bold mb-3">{t("Need Help?", "Тусламж хэрэгтэй юу?")}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {t("Contact us via Facebook page for questions and support.", "Асуулт, тусламж хэрэгтэй бол Facebook хуудсаар холбогдоно уу.")}
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61586932334071"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            JKM AI Trading System
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-gray-600 font-mono">
          © 2025–2026 JKM Copilot. {t("All rights reserved.", "Бүх эрх хуулиар хамгаалагдсан.")}
        </div>
      </footer>
    </div>
  )
}
