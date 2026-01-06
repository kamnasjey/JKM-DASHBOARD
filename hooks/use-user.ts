"use client"

import { useState, useEffect } from "react"
import { auth, getToken } from "@/lib/api"
import type { User } from "@/lib/types"

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    auth
      .me()
      .then((data) => {
        setUser(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[v0] Failed to fetch user:", err)
        setError(err.message)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const refresh = async () => {
    try {
      const data = await auth.me()
      setUser(data)
      setError(null)
    } catch (err: any) {
      console.error("[v0] Failed to refresh user:", err)
      setError(err.message)
      setUser(null)
    }
  }

  return { user, loading, error, refresh }
}
