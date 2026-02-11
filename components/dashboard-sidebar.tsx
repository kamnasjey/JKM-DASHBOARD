"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, Settings, User, Layers, X, BarChart3, LineChart, TestTube2, Wrench, Radio, Crown, MessageCircle, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { PlanSheet } from "@/components/plan-sheet"
import { RepairSheet } from "@/components/repair-sheet"

interface SidebarProps {
  isAdmin?: boolean
  isMobile?: boolean
  onNavigate?: () => void
  onOpenSupport?: () => void
}

const navItems = [
  {
    label: "Dashboard",
    labelMn: "Хянах самбар",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Scanner Config",
    labelMn: "Скан тохиргоо",
    href: "/dashboard/scanner-config",
    icon: Radio,
  },
  {
    label: "History",
    labelMn: "Түүх",
    href: "/performance",
    icon: BarChart3,
  },
  {
    label: "Simulator",
    labelMn: "Симулятор",
    href: "/simulator",
    icon: TestTube2,
  },
  {
    label: "Strategies",
    labelMn: "Стратеги",
    href: "/strategies",
    icon: Layers,
  },
  {
    label: "Profile",
    labelMn: "Профайл",
    href: "/profile",
    icon: User,
  },
  {
    label: "Guide",
    labelMn: "Заавар",
    href: "/guide",
    icon: BookOpen,
  },
]

export function DashboardSidebar({ isAdmin, isMobile, onNavigate, onOpenSupport }: SidebarProps) {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const [planSheetOpen, setPlanSheetOpen] = useState(false)
  const [repairSheetOpen, setRepairSheetOpen] = useState(false)

  const handleClick = () => {
    if (isMobile && onNavigate) {
      onNavigate()
    }
  }

  const getLabel = (en: string, mn: string) => lang === "mn" ? mn : en

  return (
    <>
      <aside
        className={cn(
          "w-64 border-r border-sidebar-border bg-sidebar",
          isMobile ? "h-full" : "hidden lg:block"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="size-9 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center text-primary neon-glow">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">JKM Copilot</h1>
                <p className="text-[10px] text-primary/70 font-mono tracking-wider">TRADING AI</p>
              </div>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onNavigate} className="lg:hidden">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          <nav className="flex-1 space-y-1 p-4" data-tour="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClick}
                  data-tour={item.href === "/guide" ? "guide-link" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 neon-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-primary/80",
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{getLabel(item.label, item.labelMn)}</span>
                </Link>
              )
            })}

            {/* Plan Button - Opens Sheet */}
            <button
              onClick={() => setPlanSheetOpen(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20"
            >
              <Crown className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <span>{getLabel("Plan", "Төлөвлөгөө")}</span>
            </button>

            {/* Support Button - Green */}
            <button
              onClick={onOpenSupport}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              <span>{getLabel("Support", "Тусламж")}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setRepairSheetOpen(true)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-primary/80"
              >
                <Wrench className="h-5 w-5 flex-shrink-0" />
                <span>{getLabel("Repair", "Засварын газар")}</span>
              </button>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={handleClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  pathname === "/admin"
                    ? "bg-primary/15 text-primary border border-primary/30 neon-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-primary/80",
                )}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span>{getLabel("Admin", "Админ")}</span>
              </Link>
            )}
          </nav>
        </div>
      </aside>

      {/* Plan Sheet */}
      <PlanSheet open={planSheetOpen} onOpenChange={setPlanSheetOpen} />

      {/* Repair Sheet */}
      <RepairSheet open={repairSheetOpen} onOpenChange={setRepairSheetOpen} />
    </>
  )
}
