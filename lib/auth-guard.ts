"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function useAuthGuard(requireAuth = true) {
  const router = useRouter()
  const { status } = useSession()
  const isAuthed = status === "authenticated"

  useEffect(() => {
    if (status === "loading") return

    if (requireAuth && !isAuthed) {
      router.push("/auth/login")
      return
    }

    if (!requireAuth && isAuthed) {
      const path = window.location.pathname
      if (path === "/login" || path === "/register" || path.startsWith("/auth/")) {
        router.push("/dashboard")
      }
    }
  }, [requireAuth, router, isAuthed, status])

  return { isAuthenticated: isAuthed }
}
