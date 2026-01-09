"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import { getToken } from "@/lib/auth"

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = getToken()

  useEffect(() => {
    if (!token) {
      router.push("/login")
    }
  }, [router, token])

  if (!token) return null

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
