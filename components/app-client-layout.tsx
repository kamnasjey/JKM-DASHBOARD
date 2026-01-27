"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import { useSession } from "next-auth/react"
import { SignalsProvider } from "@/context/SignalsContext"

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [router, status])

  if (status !== "authenticated") return null

  return (
    <SignalsProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SignalsProvider>
  )
}

