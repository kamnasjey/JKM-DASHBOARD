"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Activity, Clock, Server } from "lucide-react"

type ServiceStatus = "operational" | "degraded" | "down" | "checking"

interface Service {
  name: string
  nameMn: string
  status: ServiceStatus
  latency?: number
}

export default function StatusPage() {
  const [lang, setLang] = useState<"en" | "mn">("en")
  const t = (en: string, mn: string) => lang === "en" ? en : mn

  const [services, setServices] = useState<Service[]>([
    { name: "API", nameMn: "API", status: "checking" },
    { name: "Market Data Ingestion", nameMn: "Зах зээлийн дата", status: "checking" },
    { name: "Scanner Engine", nameMn: "Сканнер систем", status: "checking" },
    { name: "Dashboard", nameMn: "Dashboard", status: "checking" },
    { name: "Authentication", nameMn: "Нэвтрэлт", status: "checking" },
  ])

  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    // Simulate health check
    const checkHealth = async () => {
      // In production, this would call actual health endpoints
      await new Promise(resolve => setTimeout(resolve, 1500))

      setServices([
        { name: "API", nameMn: "API", status: "operational", latency: 45 },
        { name: "Market Data Ingestion", nameMn: "Зах зээлийн дата", status: "operational", latency: 120 },
        { name: "Scanner Engine", nameMn: "Сканнер систем", status: "operational", latency: 89 },
        { name: "Dashboard", nameMn: "Dashboard", status: "operational", latency: 32 },
        { name: "Authentication", nameMn: "Нэвтрэлт", status: "operational", latency: 28 },
      ])
      setLastChecked(new Date())
    }

    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case "down":
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Activity className="w-5 h-5 text-gray-400 animate-pulse" />
    }
  }

  const getStatusText = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return { en: "Operational", mn: "Хэвийн" }
      case "degraded":
        return { en: "Degraded", mn: "Удаашралтай" }
      case "down":
        return { en: "Down", mn: "Зогссон" }
      default:
        return { en: "Checking...", mn: "Шалгаж байна..." }
    }
  }

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return "text-green-400 bg-green-400/10 border-green-400/30"
      case "degraded":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
      case "down":
        return "text-red-400 bg-red-400/10 border-red-400/30"
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/30"
    }
  }

  const allOperational = services.every(s => s.status === "operational")

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
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">API Status</h1>
              <p className="text-gray-500 text-sm">{t("System health and status", "Системийн төлөв байдал")}</p>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`p-6 rounded-xl border mb-8 ${allOperational ? "bg-green-400/5 border-green-400/20" : "bg-yellow-400/5 border-yellow-400/20"}`}>
          <div className="flex items-center gap-3">
            {allOperational ? (
              <CheckCircle className="w-8 h-8 text-green-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${allOperational ? "text-green-400" : "text-yellow-400"}`}>
                {allOperational
                  ? t("All Systems Operational", "Бүх систем хэвийн ажиллаж байна")
                  : t("Some Systems Degraded", "Зарим систем удаашралтай")}
              </h2>
              {lastChecked && (
                <p className="text-gray-500 text-sm mt-1">
                  {t("Last checked:", "Сүүлд шалгасан:")} {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Services */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4">{t("Services", "Үйлчилгээнүүд")}</h2>
          <div className="space-y-3">
            {services.map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-[#111111] border border-white/10">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <span className="font-medium">{lang === "en" ? service.name : service.nameMn}</span>
                </div>
                <div className="flex items-center gap-4">
                  {service.latency && (
                    <span className="text-xs text-gray-500 font-mono">{service.latency}ms</span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                    {t(getStatusText(service.status).en, getStatusText(service.status).mn)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Uptime Stats */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4">{t("Uptime & Performance", "Uptime & Гүйцэтгэл")}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                {t("Last 24h Uptime", "Сүүлийн 24ц Uptime")}
              </div>
              <p className="text-3xl font-black text-green-400">99.9%</p>
            </div>
            <div className="p-5 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Activity className="w-4 h-4" />
                {t("Avg Response Time", "Дундаж хариу хугацаа")}
              </div>
              <p className="text-3xl font-black text-blue-400">62ms</p>
            </div>
            <div className="p-5 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Server className="w-4 h-4" />
                {t("Last Incident", "Сүүлийн асуудал")}
              </div>
              <p className="text-xl font-bold text-gray-300">{t("None", "Байхгүй")}</p>
            </div>
          </div>
        </section>

        {/* Incident History */}
        <section>
          <h2 className="text-lg font-bold mb-4">{t("Recent Incidents", "Сүүлийн асуудлууд")}</h2>
          <div className="p-6 rounded-xl bg-[#111111] border border-white/10 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">{t("No incidents in the last 30 days", "Сүүлийн 30 хоногт асуудал гараагүй")}</p>
          </div>
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
