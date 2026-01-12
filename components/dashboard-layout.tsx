"use client"

import type React from "react"

import { useState } from "react"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD")
  const { data: session } = useSession()
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch("/api/owner/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        setIsOwner(Boolean(d?.isOwner))
      })
      .catch(() => {
        if (!mounted) return
        setIsOwner(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar isAdmin={isOwner} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar user={session?.user ?? null} selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
