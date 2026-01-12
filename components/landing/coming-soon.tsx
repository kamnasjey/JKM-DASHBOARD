"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Bell, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function ComingSoonLanding() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with email service (Mailchimp, etc.)
    console.log("Subscribe:", email)
    setSubscribed(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">JKM Copilot</span>
          </div>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              Нэвтрэх
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Удахгүй...</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            AI Арилжааны
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Дохио Систем
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto">
            Хиймэл оюун ухаанаар удирду|гдсан арилжааны дохио, стратеги, эрсдлийн удирдлага. 
            Монголын хөрөнгийн зах зээлд зориулсан.
          </p>

          {/* Email Subscribe */}
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="И-мэйл хаяг"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-3"
              >
                Мэдэгдэл авах
              </Button>
            </form>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-emerald-400">
                ✓ Бүртгэгдлээ! Эхлэхэд бид танд мэдэгдэнэ.
              </p>
            </div>
          )}

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            {[
              { title: "AI Дохио", desc: "Машин сургалтаар" },
              { title: "Эрсдлийн Удирдлага", desc: "Position sizing" },
              { title: "Realtime", desc: "Шууд мэдэгдэл" },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 JKM Copilot. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
