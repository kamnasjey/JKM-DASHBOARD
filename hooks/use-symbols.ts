"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

// Fallback symbols - only include available symbols from VPS
// Available: AUDJPY, AUDUSD, BTCUSD, EURAUD, EURCHF, EURGBP, EURJPY, EURUSD, GBPJPY, GBPUSD, NZDUSD, USDCAD, USDCHF, USDJPY, XAUUSD
const FALLBACK_SYMBOLS = [
  "XAUUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY",
  "EURJPY", "GBPJPY", "AUDUSD", "AUDJPY", "NZDUSD",
  "USDCAD", "USDCHF", "EURCHF", "EURGBP", "EURAUD"
]

export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .symbols()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSymbols(data)
          setError(null)
        } else {
          // Empty array or invalid response - use fallback
          console.warn("[useSymbols] Empty response, using fallback")
          setSymbols(FALLBACK_SYMBOLS)
          setError(null)
        }
      })
      .catch((err) => {
        console.warn("[useSymbols] API failed, using fallback:", err.message)
        // Use fallback instead of showing error
        setSymbols(FALLBACK_SYMBOLS)
        setError(null) // Don't show error since we have fallback
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { symbols, loading, error }
}
