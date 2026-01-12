"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"

export function useSignals(params?: { limit?: number; symbol?: string }) {
  const [signals, setSignals] = useState<SignalPayloadPublicV1[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize params to prevent infinite loop
  const stableParams = useMemo(() => params, [params?.limit, params?.symbol])

  useEffect(() => {
    setLoading(true)
    api
      .signals(stableParams)
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
  }, [stableParams])

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await api.signals(stableParams)
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
