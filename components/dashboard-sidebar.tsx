"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, Target, Settings, User, Shield, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isAdmin?: boolean
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

export function DashboardSidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-sidebar-border px-6 py-4">
          <h1 className="text-xl font-bold text-sidebar-foreground">JKM Trading AI</h1>
          <p className="text-xs text-muted-foreground">Command Center</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Settings className="h-5 w-5" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </aside>
  )
}
