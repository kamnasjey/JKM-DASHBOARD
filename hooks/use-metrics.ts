"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { Metrics } from "@/lib/types"

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .metrics()
      .then((data) => {
        setMetrics(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[v0] Failed to fetch metrics:", err)
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const refresh = async () => {
    try {
      const data = await api.metrics()
      setMetrics(data)
      setError(null)
    } catch (err: any) {
      console.error("[v0] Failed to refresh metrics:", err)
      setError(err.message)
    }
  }

  return { metrics, loading, error, refresh }
}
