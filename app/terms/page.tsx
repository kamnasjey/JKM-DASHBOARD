"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, FileText, AlertTriangle, Shield, User, Scale, Mail } from "lucide-react"

export default function TermsPage() {
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">{t("Terms of Service", "Үйлчилгээний нөхцөл")}</h1>
              <p className="text-gray-500 text-sm">{t("Last updated: February 2025", "Сүүлд шинэчилсэн: 2025 оны 2-р сар")}</p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          {t(
            "By using JKM Copilot, you agree to the following terms and conditions. Please read them carefully.",
            "JKM Copilot ашигласнаар та дараах нөхцөлийг зөвшөөрнө. Уншиж танилцана уу."
          )}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">{t("1. Purpose of Service", "1. Үйлчилгээний зорилго")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t(
                "JKM Copilot is a technical analysis and market scanning tool. It provides information, analysis, and simulation capabilities. It is NOT financial advice and does NOT execute trades on your behalf.",
                "JKM Copilot нь техникийн анализ болон зах зээлийн сканнер хэрэгсэл юм. Мэдээлэл, анализ, симуляцийн боломж олгоно. Энэ нь санхүүгийн зөвлөгөө БИШ бөгөөд таны өмнөөс арилжаа хийдэггүй."
              )}
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold">{t("2. Disclaimer & Liability", "2. Хариуцлага")}</h2>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                {t(
                  "We do NOT guarantee profits or any specific trading results.",
                  "Бид ашиг/алдагдлыг баталгаажуулахгүй."
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                {t(
                  "All trading decisions are made by you. You bear full responsibility for your trades.",
                  "Арилжааны бүх шийдвэрийг хэрэглэгч өөрөө гаргана. Арилжааны хариуцлагыг бүрэн хүлээнэ."
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                {t(
                  "We are not liable for losses resulting from errors, delays, market conditions, or system outages (to the extent permitted by law).",
                  "Алдаа, саатал, зах зээлийн нөхцөл, системийн зогсолтоос үүдэх үр дүнд бид хариуцахгүй (хууль зөвшөөрсөн хэмжээнд)."
                )}
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold">{t("3. User Responsibilities", "3. Хэрэглэгчийн үүрэг")}</h2>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t(
                  "Use the service in compliance with all applicable laws and regulations.",
                  "Хууль, дүрэм зөрчихгүйгээр ашиглах."
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t(
                  "Do not engage in abuse, spam, attacks, or reverse engineering of the system.",
                  "Системийг буруугаар ашиглах (spam, халдлага, reverse engineering гэх мэт)-ыг хориглоно."
                )}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t(
                  "Keep your account credentials secure.",
                  "Бүртгэлийн мэдээллээ аюулгүй хадгална."
                )}
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold">{t("4. Intellectual Property", "4. Оюуны өмч")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t(
                "All design, code, text, and brand materials on this site are the property of JKM Copilot. Unauthorized reproduction or distribution is prohibited.",
                "Сайт дахь дизайн, код, текст, брэнд материал нь JKM Copilot-ийн өмч. Зөвшөөрөлгүй хуулбарлах, түгээхийг хориглоно."
              )}
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold">{t("5. Changes to Terms", "5. Нөхцөлийн өөрчлөлт")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t(
                "We may update these terms from time to time. Changes will be posted on this page. Continued use of the service constitutes acceptance of the updated terms.",
                "Нөхцөл өөрчлөгдөж болно. Өөрчлөлт энэ хуудсанд нийтлэгдэнэ. Үйлчилгээг үргэлжлүүлэн ашиглах нь шинэ нөхцлийг зөвшөөрсөнд тооцогдоно."
              )}
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold">{t("6. Contact", "6. Холбоо барих")}</h2>
            </div>
            <p className="text-gray-300 mb-4">
              {t(
                "For questions or concerns about these terms, please contact us:",
                "Энэ нөхцөлтэй холбоотой асуулт байвал холбогдоно уу:"
              )}
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
        </div>
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
