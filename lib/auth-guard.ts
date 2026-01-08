"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"

export function useAuthGuard(requireAuth = true) {
  const router = useRouter()

  useEffect(() => {
    const token = getToken()

    if (requireAuth && !token) {
      router.push("/auth/login")
    } else if (!requireAuth && token) {
      // If on auth pages and already logged in, redirect to dashboard
      const path = window.location.pathname
      if (path.startsWith("/auth/")) {
        router.push("/dashboard")
      }
    }
  }, [requireAuth, router])

  return { isAuthenticated: !!getToken() }
}
