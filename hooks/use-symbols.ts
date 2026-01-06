"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .symbols()
      .then((data) => {
        setSymbols(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[v0] Failed to fetch symbols:", err)
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { symbols, loading, error }
}
