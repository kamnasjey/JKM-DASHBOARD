"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, Target, Settings, User, Shield, Layers, Wrench, X, BarChart3, FlaskConical, Library } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isAdmin?: boolean
  isMobile?: boolean
  onNavigate?: () => void
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Signals",
    href: "/signals",
    icon: TrendingUp,
  },
  {
    label: "Performance",
    href: "/performance",
    icon: BarChart3,
  },
  {
    label: "Backtest",
    href: "/backtest",
    icon: FlaskConical,
  },
  {
    label: "Journey",
    href: "/journey",
    icon: Target,
  },
  {
    label: "Strategies",
    href: "/strategies",
    icon: Layers,
  },
  {
    label: "Strategy Library",
    href: "/strategies/library",
    icon: Library,
  },
  {
    label: "Risk",
    href: "/risk",
    icon: Shield,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
]

export function DashboardSidebar({ isAdmin, isMobile, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  const handleClick = () => {
    if (isMobile && onNavigate) {
      onNavigate()
    }
  }

  return (
    <aside
      className={cn(
        "w-64 border-r border-sidebar-border bg-sidebar",
        isMobile ? "h-full" : "hidden lg:block"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">JKM Trading AI</h1>
            <p className="text-xs text-muted-foreground">Command Center</p>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onNavigate} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/repair"
              onClick={handleClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/repair"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Wrench className="h-5 w-5 flex-shrink-0" />
              <span>Засварын газар</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={handleClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </aside>
  )
}
