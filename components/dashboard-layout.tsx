"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import { useUser } from "@/hooks/use-user"
import { getToken } from "@/lib/api"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, loading } = useUser()
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD")

  useEffect(() => {
    const token = getToken()
    if (!loading && !token) {
      router.push("/auth/login")
    }
  }, [loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar isAdmin={user.is_admin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar user={user} selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
