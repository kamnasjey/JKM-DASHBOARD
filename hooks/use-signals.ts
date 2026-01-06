"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"

export function useSignals(params?: { limit?: number; symbol?: string }) {
  const [signals, setSignals] = useState<SignalPayloadPublicV1[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .signals(params)
      .then((data) => {
        setSignals(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[v0] Failed to fetch signals:", err)
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [params]) // Updated to use the entire params object

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await api.signals(params)
      setSignals(data)
      setError(null)
    } catch (err: any) {
      console.error("[v0] Failed to refresh signals:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { signals, loading, error, refresh }
}
