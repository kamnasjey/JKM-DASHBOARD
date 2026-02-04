"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import { SupportChat } from "@/components/support-chat"
import { useSession } from "next-auth/react"
import { SignalsProvider } from "@/context/SignalsContext"

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useSession()
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [router, status])

  if (status !== "authenticated") return null

  return (
    <SignalsProvider>
      <div className="flex h-screen">
        <AppSidebar onOpenSupport={() => setIsSupportOpen(true)} />
        <div className="flex flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <SupportChat isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      </div>
    </SignalsProvider>
  )
}

