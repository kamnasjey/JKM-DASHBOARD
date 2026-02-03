"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Shield, Database, Eye, Lock, Trash2, Mail, Cookie } from "lucide-react"

export default function PrivacyPage() {
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
            <div className="w-12 h-12 rounded-xl bg-[#0df269]/10 border border-[#0df269]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#0df269]" />
            </div>
            <div>
              <h1 className="text-3xl font-black">{t("Privacy Policy", "Нууцлалын бодлого")}</h1>
              <p className="text-gray-500 text-sm">{t("Last updated: February 2025", "Сүүлд шинэчилсэн: 2025 оны 2-р сар")}</p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          {t(
            "We value your privacy and are committed to protecting your personal information. This policy explains what data we collect and how we use it.",
            "Бид таны нууцлалыг хамгаалахыг чухалчилна. Энэ бодлого нь ямар мэдээлэл цуглуулж, яаж ашиглахыг тайлбарлана."
          )}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">{t("1. Data We Collect", "1. Цуглуулдаг мэдээлэл")}</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">{t("Account Information", "Бүртгэлийн мэдээлэл")}</h3>
                <p className="text-sm">{t("Email address, name (if provided)", "Имэйл хаяг, нэр (хэрэв өгсөн бол)")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">{t("Usage Information", "Хэрэглээний мэдээлэл")}</h3>
                <p className="text-sm">{t("Login times, features used (for improving the service)", "Нэвтэрсэн хугацаа, ашигласан функцууд (сайжруулалт хийх зорилгоор)")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">{t("Technical Information", "Техникийн мэдээлэл")}</h3>
                <p className="text-sm">{t("Device/browser type, IP address (for security and logging)", "Төхөөрөмж/браузер, IP хаяг (аюулгүй байдал, логийн зорилгоор)")}</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold">{t("2. How We Use Your Data", "2. Мэдээллийг яаж ашиглах")}</h2>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t("To authenticate and manage your account", "Нэвтрэлт, хэрэглэгчийн тохиргоо ажиллуулах")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t("To improve system performance and security", "Системийн гүйцэтгэл, аюулгүй байдлыг сайжруулах")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t("To respond to support requests", "Support хүсэлтэд хариу өгөх")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {t("To send important service notifications", "Чухал үйлчилгээний мэдэгдэл илгээх")}
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">{t("3. Third Parties", "3. Гуравдагч тал")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              {t(
                "We may use third-party services for infrastructure, analytics, and communication (e.g., hosting, analytics tools).",
                "Бид дэд бүтэц, аналитик, харилцаа холбоонд гуравдагч үйлчилгээ ашиглаж болно (ж: hosting, analytics)."
              )}
            </p>
            <div className="p-4 rounded-lg bg-[#0df269]/5 border border-[#0df269]/20">
              <p className="text-[#0df269] text-sm font-medium">
                {t("We do NOT sell your personal information.", "Бид таны хувийн мэдээллийг ХУДАЛДАХГҮЙ.")}
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold">{t("4. Cookies", "4. Cookies")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t(
                "We use cookies to maintain your login session and remember your preferences. These are essential for the service to function properly.",
                "Сайт нь нэвтрэлт, тохиргоо сануулах зорилгоор cookie ашиглана. Эдгээр нь үйлчилгээ зөв ажиллахад шаардлагатай."
              )}
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold">{t("5. Data Security", "5. Дата хамгаалалт")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t(
                "We protect your data using industry-standard security measures including encryption, access controls, and logging. However, no system is 100% secure.",
                "Мэдээллийг шифрлэлт, зөвшөөрөл хяналт, лог гэх мэт аюулгүй байдлын арга хэмжээгээр хамгаална. Гэхдээ ямар ч систем 100% аюулгүй биш."
              )}
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-bold">{t("6. Your Rights", "6. Таны эрх")}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              {t("You have the right to:", "Та дараах эрхтэй:")}
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0df269]"></span>
                {t("View and update your personal information", "Өөрийн мэдээллийг харах/засах")}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0df269]"></span>
                {t("Request deletion of your account and data", "Бүртгэл, мэдээллээ устгуулах хүсэлт гаргах")}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0df269]"></span>
                {t("Export your data", "Мэдээллээ экспортлох")}
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-xl bg-[#111111] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">{t("7. Contact Us", "7. Холбоо барих")}</h2>
            </div>
            <p className="text-gray-300 mb-4">
              {t(
                "For privacy-related questions or to exercise your rights, contact us:",
                "Нууцлалтай холбоотой асуулт байвал холбогдоно уу:"
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
