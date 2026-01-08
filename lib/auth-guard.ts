"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function useAuthGuard(requireAuth = true) {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === "loading") return

    if (requireAuth && status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (!requireAuth && status === "authenticated") {
      const path = window.location.pathname
      if (path === "/login" || path === "/register" || path.startsWith("/auth/")) {
        router.push("/dashboard")
      }
    }
  }, [requireAuth, router, status])

  return { isAuthenticated: status === "authenticated", status }
}
