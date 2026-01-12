"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import { useSession } from "next-auth/react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD")
  const { data: session } = useSession()
  const [isOwner, setIsOwner] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // Close mobile menu on route change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <DashboardSidebar isAdmin={isOwner} />
      
      {/* Mobile Sidebar Overlay */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      {/* Mobile Sidebar with slide animation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <DashboardSidebar isAdmin={isOwner} isMobile onNavigate={closeMobileMenu} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          user={session?.user ?? null}
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
          onMenuToggle={toggleMobileMenu}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
