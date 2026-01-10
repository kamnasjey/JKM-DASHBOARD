"use client"

import type { User } from "@/lib/types"
import { useSession } from "next-auth/react"

export function useUser() {
  const { data: session, status } = useSession()

  const user: User | null = session?.user
    ? ({
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: (session.user as any).image ?? null,
      } as any)
    : null

  return {
    user,
    loading: status === "loading",
    error: null,
    refresh: async () => {},
  }
}
