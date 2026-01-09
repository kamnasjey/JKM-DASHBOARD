"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"

export function useAuthGuard(requireAuth = true) {
  const router = useRouter()
  const isAuthed = !!getToken()

  useEffect(() => {
    if (requireAuth && !isAuthed) {
      router.push("/login")
      return
    }

    if (!requireAuth && isAuthed) {
      const path = window.location.pathname
      if (path === "/login" || path === "/register" || path.startsWith("/auth/")) {
        router.push("/dashboard")
      }
    }
  }, [requireAuth, router, isAuthed])

  return { isAuthenticated: isAuthed }
}
