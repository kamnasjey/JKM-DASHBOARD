"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import { getToken } from "@/lib/auth"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    setReady(true)
  }, [router])

  if (!ready) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar isAdmin={false} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar user={null} selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
