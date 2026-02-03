"use client"

import Link from "next/link"
import { useState } from "react"

// Live Feed Data - Forex market data
const liveFeedData = [
  { symbol: "XAUUSD", tf: "M5", regime: "TREND UP", regimeColor: "green", confidence: "87%", trend: "up" },
  { symbol: "EURUSD", tf: "M5", regime: "RANGE", regimeColor: "yellow", confidence: "72%", trend: "neutral" },
  { symbol: "GBPUSD", tf: "M5", regime: "BREAKOUT", regimeColor: "green", confidence: "81%", trend: "up" },
  { symbol: "USDJPY", tf: "M5", regime: "PULLBACK", regimeColor: "red", confidence: "68%", trend: "down" },
]

// Detector Glossary - Tooltips for trading jargon
const detectorGlossary: Record<string, { en: string; mn: string }> = {
  "BOS": { en: "Break of Structure — price breaks a previous swing high/low, confirming trend continuation", mn: "Бүтцийн эвдрэл — үнэ өмнөх swing high/low-г эвдэж, тренд үргэлжлэлийг баталгаажуулна" },
  "FVG": { en: "Fair Value Gap — imbalance zone where price moved too fast, often revisited", mn: "Fair Value Gap — үнэ хэт хурдан хөдөлсөн тэнцвэргүй бүс, ихэвчлэн дахин очдог" },
  "OB": { en: "Order Block — zone where institutions placed large orders, acts as support/resistance", mn: "Order Block — том байгууллагууд захиалга байршуулсан бүс, support/resistance үүрэгтэй" },
  "CHOCH": { en: "Change of Character — first sign of trend reversal, structure breaks opposite direction", mn: "Character өөрчлөлт — тренд эргэлтийн эхний шинж, бүтэц эсрэг чиглэлд эвдэрнэ" },
  "SWEEP": { en: "Liquidity Sweep — price hunts stop losses before reversing", mn: "Liquidity Sweep — үнэ stop loss-уудыг авсны дараа эргэнэ" },
  "SFP": { en: "Swing Failure Pattern — false breakout that traps traders", mn: "Swing Failure Pattern — trader-уудыг хуурдаг хуурамч breakout" },
  "EQ_BREAK": { en: "Equal High/Low Break — breaks of equal levels where liquidity sits", mn: "Тэнцүү түвшний эвдрэл — liquidity байрлах тэнцүү түвшнүүдийн эвдрэл" },
  "GATE_REGIME": { en: "Market Regime Gate — filters trades based on trend/range conditions", mn: "Market Regime Gate — trend/range нөхцөлөөр trade шүүдэг" },
  "GATE_VOLATILITY": { en: "Volatility Gate — filters based on market volatility levels", mn: "Volatility Gate — volatility түвшингээр шүүдэг" },
}

// Sparkline component
function Sparkline({ trend, color }: { trend: string; color: string }) {
  const paths = {
    up: "M0,22 L15,18 L30,24 L45,12 L60,15 L75,8 L90,3",
    down: "M0,8 L15,12 L30,6 L45,18 L60,15 L75,22 L90,27",
    neutral: "M0,15 L15,8 L30,22 L45,8 L60,22 L75,12 L90,18",
  }
  return (
    <svg className="sparkline" width="90" height="30" style={{ stroke: color }}>
      <defs>
        <filter id={`glow-${trend}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d={paths[trend as keyof typeof paths] || paths.neutral} filter={`url(#glow-${trend})`} />
    </svg>
  )
}

// Regime Badge component
function RegimeBadge({ regime, color }: { regime: string; color: string }) {
  const colors = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${colors[color as keyof typeof colors]}`}>
      {regime}
    </span>
  )
}

export default function LandingPage() {
  const [lang, setLang] = useState<"en" | "mn">("en")
  const t = (en: string, mn: string) => lang === "en" ? en : mn

  return (
    <div className="landing-page bg-[#0a0a0a] text-white font-sans antialiased selection:bg-[#0df269]/30 selection:text-white min-h-screen">
      {/* Grid Background */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass-panel border-b border-[#28392f] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#0df269]/10 border border-[#0df269]/20 rounded flex items-center justify-center text-[#0df269]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">JKM Copilot</h1>
              <span className="text-[10px] text-gray-500 font-mono tracking-wider">just keep moving AI trading copilot</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400 font-mono">
            <a className="hover:text-[#0df269] transition-colors" href="#features">{t("How It Works", "Яаж ажилладаг")}</a>
            <a className="hover:text-[#0df269] transition-colors" href="#scanner-engine">{t("Scanner", "Сканнер")}</a>
            <a className="hover:text-[#0df269] transition-colors" href="#simulator">{t("Simulator", "Симулятор")}</a>
            <a className="hover:text-[#0df269] transition-colors" href="#faq">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "mn" : "en")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono"
            >
              <span className={lang === "en" ? "text-[#0df269]" : "text-gray-500"}>EN</span>
              <span className="text-gray-600">/</span>
              <span className={lang === "mn" ? "text-[#0df269]" : "text-gray-500"}>MN</span>
            </button>
            <Link href="/auth/login" className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors">
              {t("Login", "Нэвтрэх")}
            </Link>
            <Link href="/auth/register" className="hidden sm:block text-sm font-medium text-[#0df269] hover:text-[#0be360] transition-colors">
              {t("Sign Up", "Бүртгүүлэх")}
            </Link>
            <Link
              href="/simulator"
              className="hidden sm:flex bg-[#0df269] hover:bg-[#0be360] text-[#0a0a0a] text-xs font-bold px-4 py-2.5 rounded transition-all shadow-neon whitespace-nowrap items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{t("TRY SIMULATOR", "СИМУЛЯТОР")}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-16 pb-12 md:pt-24 md:pb-20 px-6 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0df269]/5 rounded-full blur-[100px] -z-10" />

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:items-start">
            {/* Left Content */}
            <div className="flex-1 space-y-8 lg:pt-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0df269]/5 border border-[#0df269]/20 text-[#0df269] text-[10px] font-mono font-medium mb-2 tracking-wide">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0df269] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0df269]" />
                </span>
                SYSTEM ONLINE
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
                {t("Your Personal Trading Copilot", "Таны хувийн Trading Copilot")}
                <span className="block text-base md:text-xl mt-4 text-[#0df269] font-medium font-mono leading-tight">
                  {t("24/7 Auto Scanner + Strategy Simulator", "24/7 Автомат Скан + Стратеги Симулятор")}
                </span>
              </h1>

              <p className="text-[#9cbaa8] text-base md:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed border-l-2 border-[#0df269]/30 pl-4">
                {t(
                  "Real market data every 5 minutes. Scans 24/7 using",
                  "5 минут тутам бодит дата татаж,"
                )} <span className="text-[#0df269]">{t("your own strategy", "таны өөрийн стратегиар")}</span> {t(".", "24/7 scan хийнэ.")}
                <span className="block mt-2 text-xs text-gray-600 font-mono">
                  {t("Doesn't replace a trader — helps you trade with more discipline.", "Trader орлохгүй — сахилга баттай арилжаа хийхэд туслана.")}
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/simulator"
                  className="h-14 px-8 bg-[#0df269] hover:bg-[#0be360] text-[#0a0a0a] font-bold rounded flex items-center justify-center gap-2 transition-all shadow-neon hover:scale-[1.02]"
                >
                  {t("Try Simulator", "Симулятор турших")}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/dashboard"
                  className="h-14 px-8 bg-[#1c1c1c] hover:bg-[#252525] border border-white/10 text-white font-medium rounded flex items-center justify-center gap-2 transition-colors group"
                >
                  <span className="group-hover:text-[#0df269] transition-colors">
                    {t("View Dashboard", "Dashboard харах")}
                  </span>
                  <svg className="w-4 h-4 group-hover:text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </Link>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center lg:justify-start text-xs text-[#9cbaa8] font-mono">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t("Your Strategy, Your Rules", "Таны стратеги, таны дүрэм")}
                  </span>
                  <span className="flex items-center gap-1.5 group relative">
                    <svg className="w-4 h-4 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {t("Explained Setup Detection", "Тайлбартай setup илрүүлэлт")}
                    <svg className="w-3.5 h-3.5 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* Setup Definition Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-[#1a1a1a] border border-[#0df269]/30 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                      <p className="text-white font-semibold mb-1">{t("What is a Setup?", "Setup гэж юу вэ?")}</p>
                      <p className="text-gray-400 leading-relaxed">
                        {t(
                          "A setup is when your strategy rules are met — entry conditions align (trend, trigger, confluence). It's a potential trade opportunity, not a signal to blindly follow.",
                          "Setup гэдэг нь таны стратегийн дүрмүүд биелсэн үе — entry нөхцөлүүд (trend, trigger, confluence) таарсан. Энэ нь боломжит арилжааны сонголт, сохроор дагах signal биш."
                        )}
                      </p>
                    </div>
                  </span>
                </div>
                <p className="mt-3 text-[10px] text-gray-600 font-mono">
                  ⚠️ {t("Not financial advice. You make all final decisions.", "Санхүүгийн зөвлөгөө биш. Эцсийн шийдвэрийг та гаргана.")}
                </p>
              </div>
            </div>

            {/* Live Feed Panel */}
            <div className="flex-1 w-full max-w-[720px] mx-auto lg:mr-0">
              <div className="relative rounded-2xl border border-[#28392f] bg-[#050806] overflow-hidden shadow-2xl shadow-[#0df269]/5 ring-1 ring-[#0df269]/10">
                {/* Glow effect */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-[#0df269]/20 via-transparent to-[#0df269]/20 rounded-2xl blur-sm opacity-50" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#28392f] bg-gradient-to-r from-[#111111] to-[#0a0a0a]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0df269]/10 rounded-lg border border-[#0df269]/30">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0df269] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0df269]" />
                      </span>
                      <span className="text-xs font-mono text-[#0df269] font-bold tracking-wider">LIVE FEED</span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">Last refresh: 12s ago</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/40" />
                  </div>
                </div>

                {/* Scan Line */}
                <div className="scan-line" />

                {/* Desktop Table Layout */}
                <div className="relative font-mono text-sm hidden md:block">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/5 bg-white/[0.02] text-gray-400 text-xs uppercase tracking-wider font-semibold">
                    <div className="col-span-3">Symbol</div>
                    <div className="col-span-1">TF</div>
                    <div className="col-span-3">Regime</div>
                    <div className="col-span-2">Conf.</div>
                    <div className="col-span-3 text-right">Trend (1h)</div>
                  </div>

                  {/* Table Rows */}
                  {liveFeedData.map((item, idx) => (
                    <div
                      key={item.symbol}
                      className={`grid grid-cols-12 gap-3 px-5 py-4 border-b border-white/5 items-center hover:bg-[#0df269]/5 transition-all duration-300 cursor-pointer group ${idx === liveFeedData.length - 1 ? "opacity-60" : ""}`}
                    >
                      <div className="col-span-3 font-bold text-white flex items-center gap-2.5 text-base">
                        <span className={`size-2 rounded-full ${item.regimeColor === "green" ? "bg-[#0df269] shadow-[0_0_8px_rgba(13,242,105,0.5)]" : item.regimeColor === "red" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"}`} />
                        {item.symbol}
                      </div>
                      <div className="col-span-1 text-gray-400 text-sm">{item.tf}</div>
                      <div className="col-span-3">
                        <RegimeBadge regime={item.regime} color={item.regimeColor} />
                      </div>
                      <div className="col-span-2 text-white font-bold text-base">{item.confidence}</div>
                      <div className="col-span-3 flex justify-end">
                        <Sparkline
                          trend={item.trend}
                          color={item.regimeColor === "green" ? "#22c55e" : item.regimeColor === "red" ? "#ef4444" : "#eab308"}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden p-3 space-y-3">
                  {liveFeedData.map((item, idx) => (
                    <div
                      key={item.symbol}
                      className={`relative bg-[#111111]/80 rounded-xl border border-white/5 p-4 hover:border-[#0df269]/20 transition-all ${idx === liveFeedData.length - 1 ? "opacity-60" : ""}`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`size-2.5 rounded-full ${item.regimeColor === "green" ? "bg-[#0df269] shadow-[0_0_8px_rgba(13,242,105,0.5)]" : item.regimeColor === "red" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"}`} />
                          <span className="font-bold text-white text-lg font-mono">{item.symbol}</span>
                          <span className="text-xs text-gray-500 font-mono">{item.tf}</span>
                        </div>
                        <RegimeBadge regime={item.regime} color={item.regimeColor} />
                      </div>

                      {/* Card Body */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{t("Confidence", "Итгэл")}</div>
                            <div className="text-xl font-bold text-white font-mono">{item.confidence}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Trend</div>
                          <Sparkline
                            trend={item.trend}
                            color={item.regimeColor === "green" ? "#22c55e" : item.regimeColor === "red" ? "#ef4444" : "#eab308"}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="relative bg-gradient-to-r from-[#111111] to-[#0a0a0a] border-t border-[#28392f] px-5 py-3 flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-500 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Бодит дата (5 минут тутам)
                  </span>
                  <span className="text-xs font-mono text-[#0df269] animate-pulse flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#0df269] animate-ping" />
                    24/7 Scan
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Onboarding Strip */}
        <section className="py-8 px-6 bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#0a0a0a] border-y border-[#0df269]/10">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs text-gray-500 font-mono mb-4 uppercase tracking-wider">
              {t("Get Started in 3 Steps", "3 алхамаар эхлэх")}
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
              {/* Step 1 */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0df269]/5 border border-[#0df269]/20">
                <div className="w-8 h-8 rounded-full bg-[#0df269]/20 border border-[#0df269]/40 flex items-center justify-center text-[#0df269] font-bold text-sm">1</div>
                <div>
                  <p className="text-white text-sm font-medium">{t("Create Strategy", "Стратеги үүсгэ")}</p>
                  <p className="text-gray-500 text-[10px]">{t("Pick your detectors", "Detector-оо сонго")}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center px-3">
                <svg className="w-6 h-6 text-[#0df269]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div className="md:hidden">
                <svg className="w-5 h-5 text-[#0df269]/40 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">2</div>
                <div>
                  <p className="text-white text-sm font-medium">{t("Connect Telegram", "Telegram холбо")}</p>
                  <p className="text-gray-500 text-[10px]">{t("Get instant alerts", "Шууд мэдэгдэл авах")}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center px-3">
                <svg className="w-6 h-6 text-[#0df269]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div className="md:hidden">
                <svg className="w-5 h-5 text-[#0df269]/40 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm">3</div>
                <div>
                  <p className="text-white text-sm font-medium">{t("Enable Scanner", "Scanner асаа")}</p>
                  <p className="text-gray-500 text-[10px]">{t("24/7 auto monitoring", "24/7 автомат хяналт")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-white/5 bg-[#111111]/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                { value: "15+", label: t("Forex Pairs + Gold, BTC", "Forex хос + Алт, BTC") },
                { value: "5min", label: t("Real Market Data", "Бодит зах зээлийн дата") },
                { icon: "brain", label: t("Explained Setups", "Тайлбартай setup") },
                { icon: "server", label: t("24/7 Auto Scan", "24/7 автомат скан") },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  {stat.value ? (
                    <span className="text-[#0df269] font-bold font-mono">{stat.value}</span>
                  ) : (
                    <svg className="w-4 h-4 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stat.icon === "brain" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      )}
                    </svg>
                  )}
                  <span className="text-xs text-gray-300 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-24 px-6" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{t("How It Works", "Яаж ажилладаг вэ?")}</h2>
              <p className="text-[#9cbaa8] text-sm md:text-base">
                {t("Your Strategy + Real Data + 24/7 Scan = Optimal Setups", "Таны стратеги + Бодит дата + 24/7 скан = Оновчтой setup")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: "radar",
                  title: t("1. Build Your Strategy", "1. Стратегиа бүтээ"),
                  desc: t("Choose from 30+ detectors to build your approach: Gate, Trigger, Confluence.", "30+ detector-оос сонгож өөрийн арга барилыг тохируулна: Gate, Trigger, Confluence."),
                },
                {
                  icon: "ai",
                  title: t("2. Bot Scans 24/7", "2. Bot 24/7 скан хийнэ"),
                  desc: t("Pulls real market data every 5 min, scans 15+ pairs using your strategy.", "5 минут тутам бодит дата татаж, 15+ хосыг таны стратегиар скан хийнэ."),
                },
                {
                  icon: "chart",
                  title: t("3. Explained Alerts", "3. Тайлбартай мэдэгдэл"),
                  desc: t("Get Telegram + Web alerts when setups found. Explains why it triggered — you decide.", "Setup олдоход Telegram + Web мэдэгдэл. Яагаад trigger болсныг тайлбарлана."),
                },
              ].map((feature, idx) => (
                <div key={idx} className="group p-8 rounded-xl bg-[#111111] border border-white/5 hover:border-[#0df269]/50 transition-colors">
                  <div className="mb-6 size-12 rounded-lg bg-[#0df269]/10 border border-[#0df269]/20 flex items-center justify-center text-[#0df269] shadow-[0_0_15px_rgba(13,242,105,0.1)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.icon === "radar" && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      )}
                      {feature.icon === "ai" && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      )}
                      {feature.icon === "chart" && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#0df269] transition-colors">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Detector System Explanation */}
            <div className="mt-12 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#0df269]/5 to-transparent border border-[#0df269]/10">
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                <div className="flex-shrink-0">
                  <div className="size-14 rounded-xl bg-[#0df269]/10 border border-[#0df269]/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3">
                    {t("How Detector Combinations Work", "Detector хослолууд хэрхэн ажилладаг")}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    {t(
                      "Each strategy uses a unique combination of detectors tailored to specific market conditions. For example: Trend strategies use BOS + FVG to catch continuations, while Reversal strategies use SWEEP + CHoCH to spot turning points. You customize which detectors work together — the scanner runs YOUR logic on real-time data.",
                      "Стратеги бүр тодорхой зах зээлийн нөхцөлд тохируулсан өвөрмөц detector хослолыг ашигладаг. Жишээ нь: Trend стратеги BOS + FVG ашиглан үргэлжлэлийг барьдаг, харин Reversal стратеги SWEEP + CHoCH ашиглан эргэлтийг илрүүлдэг. Та ямар detector-ууд хамтдаа ажиллахыг тохируулна — scanner ТАНЫ логикийг бодит дата дээр ажиллуулна."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-[#111] border border-white/10 text-xs font-mono text-gray-300">
                      <span className="text-[#0df269]">Gate</span> → {t("Market filter", "Зах зээл шүүлт")}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-[#111] border border-white/10 text-xs font-mono text-gray-300">
                      <span className="text-yellow-400">Trigger</span> → {t("Entry signal", "Оролтын дохио")}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-[#111] border border-white/10 text-xs font-mono text-gray-300">
                      <span className="text-blue-400">Confluence</span> → {t("Confirmation", "Баталгаажуулалт")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preset Detectors Section */}
        <section className="py-20 bg-[#1c1c1c]/30 border-y border-white/5 relative">
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{t("30+ Detectors", "30+ Детектор")}</h2>
                <p className="text-[#9cbaa8] mt-2 text-sm">{t("Gate, Trigger, Confluence — build your own strategy.", "Gate, Trigger, Confluence — өөрийн стратегиа бүтээ.")}</p>
              </div>
              <Link href="/strategies" className="hidden md:flex items-center text-[#0df269] hover:text-[#0be360] font-mono text-xs gap-1 border-b border-[#0df269]/50 pb-0.5">
                {t("VIEW ALL", "БҮГДИЙГ ХАРАХ")}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Trend Continuation", type: "TRIGGER", desc: t("Catch trend continuations using BOS + FVG.", "BOS + FVG ашиглан тренд үргэлжлэлийг барина."), tags: ["BOS", "FVG", "OB"], isNew: false },
                { name: "Reversal Hunter", type: "TRIGGER", desc: t("Detect reversals using Sweep, CHoCH, SFP.", "Sweep, CHoCH, SFP ашиглан эргэлтийг илрүүлнэ."), tags: ["SWEEP", "CHOCH", "SFP"], isNew: false },
                { name: "Smart Money", type: "CONFLUENCE", desc: t("Find entries at Order Block + Imbalance zones.", "Order Block + Imbalance дээр оролт хайна."), tags: ["OB", "FVG", "EQ_BREAK"], isNew: false },
                { name: "Regime Gate", type: "GATE", desc: t("Only trade in the right market conditions.", "Зөв зах зээлийн нөхцөлд л trade нээнэ."), tags: ["GATE_REGIME", "GATE_VOLATILITY"], isNew: true },
              ].map((detector, idx) => (
                <div
                  key={idx}
                  className={`glass-panel p-5 rounded-lg hover:-translate-y-1 transition-transform duration-300 group cursor-pointer border ${detector.isNew ? "border-[#0df269]/30 bg-[#0df269]/[0.02]" : "border-white/5 hover:border-[#0df269]/30"} relative overflow-hidden`}
                >
                  {detector.isNew && (
                    <div className="absolute top-0 right-0 p-2">
                      <span className="bg-[#0df269] text-[#0a0a0a] text-[10px] font-bold px-2 py-0.5 rounded shadow-neon">{t("NEW", "ШИНЭ")}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <svg className="w-6 h-6 text-[#0df269] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-white border border-white/10">{detector.type}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[#0df269] transition-colors">{detector.name}</h3>
                  <p className="text-xs text-[#9cbaa8] mb-4">{detector.desc}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-gray-400">
                    {detector.tags.map((tag, i) => (
                      <span key={i} className="relative group/tag cursor-help">
                        <span className="bg-black/60 px-2 py-1 rounded border border-white/5 hover:border-[#0df269]/30 hover:text-[#0df269] transition-colors">{tag}</span>
                        {detectorGlossary[tag] && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#0df269]/20 rounded-lg text-[11px] text-gray-300 w-64 opacity-0 invisible group-hover/tag:opacity-100 group-hover/tag:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
                            <span className="font-bold text-[#0df269] block mb-1">{tag}</span>
                            {lang === "en" ? detectorGlossary[tag].en : detectorGlossary[tag].mn}
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]" />
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategy Simulator Section - Exact Match to Real Simulator */}
        <section className="py-24 px-6 relative overflow-hidden" id="simulator">
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#0df269]/5 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-6xl mx-auto">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0df269]/10 border border-[#0df269]/20 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0df269] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0df269]" />
                </span>
                <span className="text-xs font-mono text-[#0df269]">{t("BACKTESTING ENGINE", "BACKTEST ENGINE")}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">Strategy Simulator</h2>
              <p className="text-[#9cbaa8] text-base max-w-2xl mx-auto">
                {t(
                  "Multi-timeframe backtesting across 5m → 4h. Test your strategy on historical data.",
                  "5m → 4h бүх timeframe дээр backtest хийнэ. Стратегиа түүхэн дата дээр туршина."
                )}
              </p>
            </div>

            {/* Simulator Interface Preview */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#0df269]/20 via-transparent to-blue-500/20 rounded-2xl blur-xl opacity-50" />

              <div className="relative glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-[#0a0a0a]">
                {/* Header */}
                <div className="bg-[#111111] border-b border-white/5 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <h3 className="text-lg font-bold">Strategy Simulator</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#0df269]/10 text-[#0df269] text-xs font-mono border border-[#0df269]/20 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Multi-TF Auto
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* Left: Configuration + Results */}
                  <div className="flex-1 p-6 space-y-6">
                    {/* Configuration Card */}
                    <div className="bg-[#111111] rounded-xl border border-white/5 p-5">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white">Configuration</h4>
                        <p className="text-xs text-gray-500">{t("Select symbol, strategy, and date range", "Symbol, стратеги, хугацаа сонгоно")}</p>
                      </div>

                      {/* Dropdowns Row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase">Symbol</label>
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white flex items-center justify-between">
                            <span>EURJPY</span>
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase">Strategy</label>
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white flex items-center justify-between">
                            <span className="truncate">Trend Continuation</span>
                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-400 uppercase">Date Range</label>
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white flex items-center justify-between">
                            <span>30 {t("days", "хоног")}</span>
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Active Detectors */}
                      <div className="border-t border-white/5 pt-4 mb-4">
                        <label className="text-[10px] font-medium text-gray-400 uppercase mb-2 block">Active Detectors (5)</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-yellow-400">🚦</span>
                            <span className="text-[10px] text-gray-500">Gate:</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">GATE_REGIME</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-green-400">🎯</span>
                            <span className="text-[10px] text-gray-500">Trigger:</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">BOS</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">FVG</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-blue-400">🔗</span>
                            <span className="text-[10px] text-gray-500">Confluence:</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">OB</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">PINBAR_AT_LEVEL</span>
                          </div>
                        </div>
                      </div>

                      {/* Timeframes */}
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Running on: <strong className="text-white">5m, 15m, 30m, 1h, 4h</strong></span>
                      </div>

                      {/* Run Button */}
                      <button className="w-full bg-[#0df269] text-[#0a0a0a] font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-[#0be360] transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Run Simulation
                      </button>
                    </div>

                    {/* Results Summary Cards */}
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: "Total Trades", value: "28", sub: "across all TFs" },
                        { label: "Win Rate", value: "67.8%", sub: "19W / 9L", color: "text-[#0df269]" },
                        { label: "TP Hits", value: "19", color: "text-[#0df269]" },
                        { label: "SL Hits", value: "9", color: "text-red-400" },
                        { label: "Best TF", value: "15M", sub: "71.4% WR" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-[#111111] rounded-lg p-3 border border-white/5 text-center">
                          <p className="text-[10px] text-gray-500 font-mono mb-1">{stat.label}</p>
                          <p className={`text-xl font-bold ${stat.color || "text-white"}`}>{stat.value}</p>
                          {stat.sub && <p className="text-[10px] text-gray-600">{stat.sub}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Timeframe Breakdown */}
                    <div className="bg-[#111111] rounded-xl border border-white/5 p-5">
                      <h4 className="text-sm font-semibold mb-4">{t("Timeframe Breakdown", "Timeframe тус бүрээр")}</h4>
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { tf: "5M", entries: 8, tp: 5, sl: 3, wr: 62.5 },
                          { tf: "15M", entries: 7, tp: 5, sl: 2, wr: 71.4 },
                          { tf: "30M", entries: 5, tp: 3, sl: 2, wr: 60.0 },
                          { tf: "1H", entries: 5, tp: 4, sl: 1, wr: 80.0 },
                          { tf: "4H", entries: 3, tp: 2, sl: 1, wr: 66.7 },
                        ].map((tf, i) => (
                          <div key={i} className={`p-3 rounded-lg border text-center ${tf.entries > 0 ? "border-[#0df269]/30 bg-[#0df269]/5" : "border-white/5 bg-white/[0.02]"}`}>
                            <p className="text-sm font-semibold mb-1">{tf.tf}</p>
                            <p className="text-2xl font-bold">{tf.entries}</p>
                            <p className="text-[10px] text-gray-500">entries</p>
                            <div className="mt-2 text-[10px]">
                              <span className="text-[#0df269]">{tf.tp}W</span>
                              <span className="mx-1 text-gray-600">/</span>
                              <span className="text-red-400">{tf.sl}L</span>
                              <span className="mx-1 text-gray-600">•</span>
                              <span className={tf.wr >= 50 ? "text-[#0df269] font-medium" : "text-red-400 font-medium"}>{tf.wr.toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Trades Stream */}
                  <div className="w-full lg:w-96 bg-[#111111] border-t lg:border-t-0 lg:border-l border-white/5 p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h4 className="font-medium">{t("Live Trades Stream", "Trade Stream")}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] border border-[#0df269]/30 text-[#0df269]">TP: 19</span>
                        <span className="px-2 py-0.5 rounded text-[10px] border border-red-500/30 text-red-400">SL: 9</span>
                      </div>
                    </div>

                    {/* Winrate Bar */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-white/5 mb-4">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-400">Winrate</span>
                          <span className="font-bold text-[#0df269]">67.8%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div className="h-full bg-[#0df269] rounded-full transition-all" style={{ width: "67.8%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Trade Cards */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {[
                        { id: 1, dir: "BUY", entry: "161.450", sl: "160.650", tp: "163.850", outcome: "TP", r: "+3.0", time: "Jan 28, 14:30", detector: "BOS" },
                        { id: 2, dir: "BUY", entry: "160.820", sl: "159.820", tp: "163.320", outcome: "TP", r: "+2.5", time: "Jan 25, 09:15", detector: "FVG" },
                        { id: 3, dir: "SELL", entry: "162.180", sl: "162.880", tp: "160.070", outcome: "SL", r: "-1.0", time: "Jan 23, 16:45", detector: "BOS" },
                        { id: 4, dir: "BUY", entry: "159.750", sl: "158.550", tp: "163.350", outcome: "TP", r: "+3.0", time: "Jan 20, 11:00", detector: "OB" },
                        { id: 5, dir: "BUY", entry: "159.280", sl: "158.380", tp: "161.980", outcome: "TP", r: "+3.0", time: "Jan 18, 08:30", detector: "FVG" },
                      ].map((trade, i) => (
                        <div key={i} className={`relative p-3 rounded-lg border transition-all ${trade.outcome === "TP" ? "border-[#0df269]/30 bg-[#0df269]/5" : "border-red-500/30 bg-red-500/5"}`}>
                          {/* Trade number */}
                          <div className="absolute -top-2 -left-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${trade.outcome === "TP" ? "bg-[#0df269] text-[#0a0a0a]" : "bg-red-500 text-white"}`}>
                              #{trade.id}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            {/* Left: Direction + Entry */}
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${trade.dir === "BUY" ? "bg-[#0df269]/20 text-[#0df269]" : "bg-red-500/20 text-red-400"}`}>
                                {trade.dir === "BUY" ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium">{trade.dir} @ {trade.entry}</p>
                                <p className="text-[10px] text-gray-500">{trade.time}</p>
                              </div>
                            </div>

                            {/* Right: Outcome */}
                            <div className="flex items-center gap-1">
                              {trade.outcome === "TP" ? (
                                <>
                                  <svg className="w-4 h-4 text-[#0df269]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs font-bold text-[#0df269]">TP HIT!</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0df269] text-[#0a0a0a] font-bold">{trade.r}R</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs font-bold text-red-400">SL HIT</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold">{trade.r}R</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* SL/TP + Detector */}
                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                            <div className="flex items-center gap-3">
                              <span>SL: <span className="text-red-400 font-mono">{trade.sl}</span></span>
                              <span>TP: <span className="text-[#0df269] font-mono">{trade.tp}</span></span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{trade.detector}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <Link
                        href="/simulator"
                        className="w-full bg-[#0df269] text-[#0a0a0a] font-bold py-3 rounded-lg text-sm hover:bg-[#0be360] transition-all shadow-neon flex justify-center items-center gap-2 group"
                      >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {t("TRY YOUR STRATEGY", "СТРАТЕГИА ТУРШИХ")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Scanner Engine Section */}
        <section id="scanner-engine" className="py-20 bg-[#0a0a0a] relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0df269]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-400 font-medium mb-4">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                24/7 {t("ALWAYS MONITORING", "ТАСРАЛТГҮЙ АЖИЛЛАЖ БАЙНА")}
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                {t("Scanner Engine", "Сканнер Систем")}
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                {t(
                  "Your strategy runs 24/7 on our servers. When a setup matches, you get instant alerts.",
                  "Таны стратеги манай серверт 24/7 ажиллана. Setup олдоход шууд мэдэгдэл авна."
                )}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: Scanner Dashboard Mock */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-[#0df269]/20 to-blue-500/20 rounded-2xl blur-xl opacity-50" />
                <div className="relative bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Scanner Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0c0c0c]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{t("Live Scanner", "Идэвхтэй Сканнер")}</div>
                        <div className="text-[10px] text-gray-500 font-mono">scanner_v2.0</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-[#0df269]/20 border border-[#0df269]/40 text-[10px] text-[#0df269] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#0df269] rounded-full animate-pulse" />
                        RUNNING
                      </span>
                    </div>
                  </div>

                  {/* Symbols Grid */}
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
                      <span>{t("Monitoring", "Хяналтанд")}</span>
                      <span className="text-[#0df269]">17 {t("symbols", "хос")}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { symbol: "XAUUSD", status: "scanning" },
                        { symbol: "EURUSD", status: "idle" },
                        { symbol: "GBPUSD", status: "idle" },
                        { symbol: "USDJPY", status: "scanning" },
                        { symbol: "EURJPY", status: "alert" },
                        { symbol: "GBPJPY", status: "idle" },
                        { symbol: "AUDUSD", status: "scanning" },
                        { symbol: "NZDUSD", status: "idle" },
                        { symbol: "USDCAD", status: "idle" },
                        { symbol: "USDCHF", status: "scanning" },
                        { symbol: "EURGBP", status: "idle" },
                        { symbol: "BTCUSD", status: "idle" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className={`px-2 py-1.5 rounded text-[10px] font-mono text-center transition-all ${
                            item.status === "alert"
                              ? "bg-[#0df269]/20 border border-[#0df269]/50 text-[#0df269] animate-pulse"
                              : item.status === "scanning"
                              ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                              : "bg-white/5 border border-white/10 text-gray-500"
                          }`}
                        >
                          {item.symbol}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Activity Feed */}
                  <div className="border-t border-white/10 p-4">
                    <div className="text-xs text-gray-500 mb-3">{t("Recent Activity", "Сүүлийн үйлдлүүд")}</div>
                    <div className="space-y-2 text-[11px] font-mono">
                      {[
                        { time: "14:32:05", symbol: "EURJPY", action: "SETUP FOUND", type: "alert" },
                        { time: "14:31:58", symbol: "XAUUSD", action: "Scanning M15...", type: "scan" },
                        { time: "14:31:52", symbol: "USDJPY", action: "Scanning H1...", type: "scan" },
                        { time: "14:31:45", symbol: "AUDUSD", action: "Scanning M5...", type: "scan" },
                      ].map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-2 rounded ${
                            log.type === "alert" ? "bg-[#0df269]/10 border border-[#0df269]/30" : "bg-white/5"
                          }`}
                        >
                          <span className="text-gray-600">{log.time}</span>
                          <span className={log.type === "alert" ? "text-[#0df269]" : "text-gray-400"}>{log.symbol}</span>
                          <span className={log.type === "alert" ? "text-[#0df269] font-bold" : "text-gray-500"}>
                            {log.action}
                          </span>
                          {log.type === "alert" && (
                            <svg className="w-3 h-3 text-[#0df269] ml-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Features */}
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
                    <div className="text-3xl font-black text-[#0df269]">24/7</div>
                    <div className="text-xs text-gray-400 mt-1">{t("Always Running", "Тасралтгүй")}</div>
                  </div>
                  <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
                    <div className="text-3xl font-black text-blue-400">5m</div>
                    <div className="text-xs text-gray-400 mt-1">{t("Scan Interval", "Сканнер давтамж")}</div>
                  </div>
                  <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
                    <div className="text-3xl font-black text-white">17+</div>
                    <div className="text-xs text-gray-400 mt-1">{t("Symbols", "Хос")}</div>
                  </div>
                  <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
                    <div className="text-3xl font-black text-yellow-400">31</div>
                    <div className="text-xs text-gray-400 mt-1">{t("Detectors", "Детектор")}</div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-4">
                  {[
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      ),
                      title: t("Instant Alerts", "Шууд мэдэгдэл"),
                      desc: t("Get notified via Telegram when a setup matches your strategy", "Setup олдоход Telegram-аар шууд мэдэгдэл авна"),
                      color: "text-[#0df269]",
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      title: t("Multi-Timeframe", "Олон Timeframe"),
                      desc: t("Scans M5, M15, M30, H1, H4 simultaneously for each symbol", "Хос бүрийг M5, M15, M30, H1, H4 дээр зэрэг сканнердана"),
                      color: "text-blue-400",
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      ),
                      title: t("Your Strategy, Your Rules", "Таны стратеги, таны дүрэм"),
                      desc: t("Configure your own detectors, risk:reward ratio, and filters", "Өөрийн detector, RR, filter тохируулна"),
                      color: "text-yellow-400",
                    },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-[#111111] rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                      <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${feature.color}`}>
                        {feature.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white">{feature.title}</div>
                        <div className="text-sm text-gray-400 mt-1">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href="/auth/register"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg text-sm transition-all flex justify-center items-center gap-2 group"
                >
                  <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t("START YOUR SCANNER", "СКАННЕР ЭХЛҮҮЛЭХ")}
                </Link>
              </div>
            </div>

            {/* Telegram Alert Sample */}
            <div className="mt-16 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">
                  {t("What you'll receive", "Танд ирэх мэдэгдэл")}
                </p>
                <h3 className="text-xl font-bold text-white">{t("Telegram Alert Example", "Telegram мэдэгдлийн жишээ")}</h3>
              </div>

              {/* Telegram Message Mock */}
              <div className="bg-[#1c2836] rounded-2xl border border-[#3d5a80]/30 overflow-hidden shadow-2xl">
                {/* Telegram Header */}
                <div className="flex items-center gap-3 p-3 bg-[#17212b] border-b border-[#3d5a80]/20">
                  <div className="w-10 h-10 rounded-full bg-[#0df269]/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#0df269]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">JKM Copilot Bot</div>
                    <div className="text-[10px] text-gray-400">bot</div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="p-4 space-y-3">
                  <div className="bg-[#182533] rounded-lg p-4 max-w-[85%]">
                    <div className="text-[#0df269] font-bold text-sm mb-2">🎯 NEW SETUP FOUND</div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Symbol:</span>
                        <span className="text-white font-bold">XAUUSD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Direction:</span>
                        <span className="text-[#0df269] font-bold">🟢 BUY</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timeframe:</span>
                        <span className="text-white">M15</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">R:R Ratio:</span>
                        <span className="text-yellow-400 font-bold">1:2.8</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t("Why triggered", "Яагаад trigger болсон")}</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0df269]"></span>
                          <span>Gate: <span className="text-white">TREND UP</span> {t("confirmed", "баталгаажсан")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          <span>Trigger: <span className="text-white">BOS</span> {t("at key level", "чухал түвшинд")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          <span>Confluence: <span className="text-white">FVG + Fibo 61.8%</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-[10px] text-gray-500">
                      {t("Strategy:", "Стратеги:")} My Trend Strategy • 14:32 UTC
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                {t("Each setup includes full explanation with evidence", "Setup бүр бүрэн тайлбар, нотолгоотой")}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-[#1c1c1c]/20" id="faq">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold mb-2">FAQ</h2>
              <p className="text-sm text-gray-500">{t("Frequently Asked Questions", "Түгээмэл асуултууд")}</p>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: t("Where does the market data come from?", "Зах зээлийн дата хаанаас авдаг вэ?"),
                  a: t(
                    "We pull real-time data from third-party sources every 5 minutes and store it on our own servers. Supports 15+ Forex pairs + XAUUSD, BTCUSD.",
                    "Гуравдагч эх сурвалжаас 5 минут тутам тасралтгүй татаж, өөрсдийн серверт хадгалдаг. 15+ Forex хос + XAUUSD, BTCUSD дэмждэг."
                  ),
                },
                {
                  q: t("Does this replace a trader 100%?", "Энэ 100% trader-ийг орлох уу?"),
                  a: t(
                    "No. JKM Copilot helps you find optimal setups using your strategy. You analyze and make the final decision.",
                    "Үгүй. Setup олдохоор та харж, өөрөө дүн шинжилгээ хийж, шийдвэрээ гаргана."
                  ),
                },
                {
                  q: t("Does each setup come with an explanation?", "Setup бүр дээр тайлбар байдаг уу?"),
                  a: t(
                    "Yes. We explain why it triggered, which detectors fired, and what conditions matched.",
                    "Тийм. Яагаад trigger болсон, ямар detector-ууд давсан, ямар нөхцөл таарсныг тайлбарлана."
                  ),
                },
                {
                  q: t("Is this financial advice?", "Энэ санхүүгийн зөвлөгөө юу?"),
                  a: t(
                    "No. This is a technical tool, not financial advice. You make all final decisions yourself.",
                    "Үгүй. Энэ нь санхүүгийн зөвлөгөө биш, зөвхөн техникийн хэрэгсэл юм."
                  ),
                },
              ].map((faq, idx) => (
                <div key={idx} className="border border-white/10 rounded-lg bg-[#111111] overflow-hidden">
                  <details className="group">
                    <summary className="flex justify-between items-center p-5 cursor-pointer list-none hover:bg-white/5 transition-colors">
                      <span className="font-medium text-gray-200 text-sm">{faq.q}</span>
                      <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5 text-sm leading-relaxed border-t border-white/5 pt-4">
                      <p className="text-gray-300">{faq.a}</p>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0df269]/10 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
              {t("Ready to Trade with More Discipline?", "Илүү сахилга баттай арилжаа хийхэд бэлэн үү?")}
            </h2>
            <p className="text-base text-[#9cbaa8] mb-10 max-w-xl mx-auto">
              {t(
                "JKM Copilot doesn't trade for you — it helps you become a better trader.",
                "Таны ажлыг хөнгөвчилж, илүү сайн trader болоход туслах хэрэгсэл юм."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/simulator"
                className="h-14 px-10 bg-[#0df269] hover:bg-[#0be360] text-[#0a0a0a] font-bold text-lg rounded shadow-neon transition-all hover:scale-105 flex items-center justify-center"
              >
                <span>{t("Try Simulator", "Симулятор туршиx")}</span>
              </Link>
            </div>
            <p className="mt-6 text-xs text-gray-600 font-mono">
              ⚠️ {t("Not financial advice. You make all final decisions.", "Санхүүгийн зөвлөгөө биш. Бүх шийдвэрийг та өөрөө гаргана.")}
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#111111] border-t border-white/10 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="size-6 bg-white/10 rounded flex items-center justify-center text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-300 text-sm">JKM Copilot</span>
                  <span className="text-[10px] text-gray-600">AI Trading Copilot</span>
                </div>
              </div>
              <div className="flex gap-8 text-xs text-gray-500 font-mono">
                <Link className="hover:text-[#0df269] transition-colors" href="/docs">{t("Documentation", "Гарын авлага")}</Link>
                <Link className="hover:text-[#0df269] transition-colors" href="/status">API Status</Link>
                <Link className="hover:text-[#0df269] transition-colors" href="/terms">{t("Terms", "Нөхцөл")}</Link>
                <Link className="hover:text-[#0df269] transition-colors" href="/privacy">{t("Privacy", "Нууцлал")}</Link>
                <a className="hover:text-[#0df269] transition-colors" href="https://www.facebook.com/profile.php?id=61575434656498" target="_blank" rel="noopener noreferrer">{t("Contact", "Холбоо барих")}</a>
              </div>
              <div className="text-[10px] text-gray-600 font-mono">
                © 2025–2026 JKM Copilot. {t("All rights reserved.", "Бүх эрх хуулиар хамгаалагдсан.")}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
