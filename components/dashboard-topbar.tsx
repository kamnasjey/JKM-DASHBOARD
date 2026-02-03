"use client"

import { useState, useEffect } from "react"
import { Bell, LogOut, Menu, Clock, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { BackButton } from "@/components/back-button"
import { useLanguage } from "@/contexts/language-context"

// Market sessions in UTC hours
const SESSIONS = [
  { name: "Sydney", emoji: "🇦🇺", openUTC: 22, closeUTC: 7, color: "text-purple-400" },
  { name: "Tokyo", emoji: "🇯🇵", openUTC: 0, closeUTC: 9, color: "text-red-400" },
  { name: "London", emoji: "🇬🇧", openUTC: 8, closeUTC: 17, color: "text-blue-400" },
  { name: "New York", emoji: "🇺🇸", openUTC: 13, closeUTC: 22, color: "text-green-400" },
]

// Convert UTC hour to Ulaanbaatar time (UTC+8)
function utcToUB(utcHour: number): string {
  const ubHour = (utcHour + 8) % 24
  return `${ubHour.toString().padStart(2, "0")}:00`
}

// Check if session is currently open
function isSessionOpen(openUTC: number, closeUTC: number): boolean {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcDay = now.getUTCDay()

  // Global forex weekend closure: Fri 22:00 UTC -> Sun 22:00 UTC
  const weekendClosed =
    utcDay === 6 ||
    (utcDay === 5 && utcHour >= 22) ||
    (utcDay === 0 && utcHour < 22)

  if (weekendClosed) return false
  
  if (openUTC < closeUTC) {
    // Normal case: e.g., 8-17
    return utcHour >= openUTC && utcHour < closeUTC
  } else {
    // Overnight case: e.g., 22-7 (Sydney)
    return utcHour >= openUTC || utcHour < closeUTC
  }
}

// Get time until session opens/closes
function getSessionStatus(openUTC: number, closeUTC: number): { isOpen: boolean; timeLeft: string } {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMin = now.getUTCMinutes()
  const utcDay = now.getUTCDay()

  const weekendClosed =
    utcDay === 6 ||
    (utcDay === 5 && utcHour >= 22) ||
    (utcDay === 0 && utcHour < 22)

  if (weekendClosed) {
    return { isOpen: false, timeLeft: "амралт" }
  }
  const isOpen = isSessionOpen(openUTC, closeUTC)
  
  let targetHour: number
  if (isOpen) {
    // Time until close
    targetHour = closeUTC
  } else {
    // Time until open
    targetHour = openUTC
  }
  
  let hoursLeft = targetHour - utcHour
  if (hoursLeft <= 0) hoursLeft += 24
  if (hoursLeft === 24 && utcMin > 0) hoursLeft = 0
  
  const minsLeft = 60 - utcMin
  if (minsLeft < 60) hoursLeft -= 1
  
  if (hoursLeft < 0) hoursLeft += 24
  
  const timeLeft = hoursLeft > 0 ? `${hoursLeft}ц` : `${minsLeft}м`
  
  return { isOpen, timeLeft }
}

function MarketSessions() {
  const [, setTick] = useState(0)
  
  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="hidden md:flex items-center gap-2 text-xs">
      {SESSIONS.map((session) => {
        const { isOpen, timeLeft } = getSessionStatus(session.openUTC, session.closeUTC)
        return (
          <div
            key={session.name}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
              isOpen 
                ? "bg-green-500/15 border border-green-500/40" 
                : "bg-zinc-800/50 border border-zinc-700/50"
            }`}
            title={`${session.name}: ${utcToUB(session.openUTC)} - ${utcToUB(session.closeUTC)} (Улаанбаатар)`}
          >
            <span className="text-sm">{session.emoji}</span>
            <div className="flex flex-col leading-tight">
              <span className={`font-semibold ${isOpen ? "text-green-400" : "text-zinc-400"}`}>
                {session.name}
              </span>
              <span className={`text-[10px] ${isOpen ? "text-green-300" : "text-zinc-500"}`}>
                {isOpen ? (
                  <>
                    <span className="text-green-400">OPEN</span>
                    <span className="mx-1">•</span>
                    <span>хаах {timeLeft}</span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-500">CLOSED</span>
                    <span className="mx-1">•</span>
                    <span>нээх {utcToUB(session.openUTC)}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface TopbarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
  onMenuToggle?: () => void
}

export function DashboardTopbar({ user, onMenuToggle }: TopbarProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()

  const handleLogout = async () => {
    toast({
      title: t("Logged out", "Гарлаа"),
      description: t("Successfully logged out", "Амжилттай гарлаа"),
    })
    await signOut({ callbackUrl: "/auth/login" })
    router.push("/auth/login")
  }

  const toggleLanguage = () => {
    setLang(lang === "en" ? "mn" : "en")
  }

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-primary/20 bg-card/80 backdrop-blur-sm px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <BackButton fallbackHref="/dashboard" />
        <MarketSessions />
      </div>

      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 h-9 text-xs font-mono"
          title={t("Switch language", "Хэл солих")}
        >
          <Globe className="h-4 w-4" />
          <span className={lang === "en" ? "text-primary font-semibold" : "text-muted-foreground"}>EN</span>
          <span className="text-muted-foreground/50">/</span>
          <span className={lang === "mn" ? "text-primary font-semibold" : "text-muted-foreground"}>MN</span>
        </Button>

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/40 font-semibold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline">{user?.name || "User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("My Account", "Миний бүртгэл")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("Logout", "Гарах")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
