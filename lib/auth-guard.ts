"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("jkm_ai_session_v1")
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("jkm_ai_session_v1")
}

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
