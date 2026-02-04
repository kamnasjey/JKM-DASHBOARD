"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Target, ListFilter, FileText, Settings, LogOut, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

const navItems = [
  { href: "/app", label: "Dashboard", labelMn: "Хянах самбар", icon: LayoutDashboard },
  { href: "/app/setups", label: "Setups", labelMn: "Setup-ууд", icon: Target },
  { href: "/app/signals", label: "Setups", labelMn: "Setup-ууд", icon: ListFilter },
  { href: "/app/scanner-monitor", label: "Scanner", labelMn: "Сканнер", icon: Activity },
  { href: "/app/logs", label: "Logs", labelMn: "Бүртгэл", icon: FileText },
  { href: "/app/settings", label: "Settings", labelMn: "Тохиргоо", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
    router.push("/login")
  }

  return (
    <aside className="hidden w-64 border-r border-border bg-card md:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-6">
          <Link href="/app" className="text-xl font-bold">
            JKM Trading AI
          </Link>
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-[10px] opacity-60">{item.labelMn}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="flex flex-col items-start">
              <span>Logout</span>
              <span className="text-[10px] opacity-60">Гарах</span>
            </span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
