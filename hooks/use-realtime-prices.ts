"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PriceData {
  close: number | null
  high: number | null
  low: number | null
  time: string | null
}

interface PricesResponse {
  ok: boolean
  timestamp?: number
  prices: Record<string, PriceData>
}

interface UseRealtimePricesOptions {
  /** Enable/disable the stream (default: true) */
  enabled?: boolean
  /** Fallback polling interval in ms if SSE fails (default: 2000) */
  fallbackInterval?: number
}

export function useRealtimePrices(options: UseRealtimePricesOptions = {}) {
  const { enabled = true, fallbackInterval = 2000 } = options

  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const usingFallbackRef = useRef(false)

  // Fallback polling function
  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch("/api/proxy/prices")
      if (response.ok) {
        const data: PricesResponse = await response.json()
        if (data.ok && data.prices) {
          setPrices(data.prices)
          setLastUpdate(Date.now())
          setError(null)
        }
      }
    } catch (err: any) {
      console.error("[useRealtimePrices] fallback fetch error:", err)
    }
  }, [])

  // Start SSE connection
  const startSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource("/api/proxy/prices-stream")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("[useRealtimePrices] SSE connected")
        setConnected(true)
        setError(null)
        usingFallbackRef.current = false

        // Clear fallback interval if SSE works
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current)
          fallbackIntervalRef.current = null
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const data: PricesResponse = JSON.parse(event.data)
          if (data.ok && data.prices) {
            setPrices(data.prices)
            setLastUpdate(Date.now())
          }
        } catch (err) {
          console.error("[useRealtimePrices] parse error:", err)
        }
      }

      eventSource.onerror = (err) => {
        console.error("[useRealtimePrices] SSE error:", err)
        setConnected(false)

        // Switch to fallback polling
        if (!usingFallbackRef.current) {
          usingFallbackRef.current = true
          setError("SSE connection failed, using fallback polling")

          // Start fallback polling
          if (!fallbackIntervalRef.current) {
            fetchPrices() // Fetch immediately
            fallbackIntervalRef.current = setInterval(fetchPrices, fallbackInterval)
          }
        }
      }
    } catch (err: any) {
      console.error("[useRealtimePrices] SSE setup error:", err)
      // Use fallback
      usingFallbackRef.current = true
      fetchPrices()
      fallbackIntervalRef.current = setInterval(fetchPrices, fallbackInterval)
    }
  }, [fetchPrices, fallbackInterval])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current)
      fallbackIntervalRef.current = null
    }
    setConnected(false)
  }, [])

  // Effect to start/stop SSE
  useEffect(() => {
    if (enabled) {
      startSSE()
    } else {
      cleanup()
    }

    return cleanup
  }, [enabled, startSSE, cleanup])

  return {
    prices,
    lastUpdate,
    connected,
    error,
    isUsingFallback: usingFallbackRef.current,
  }
}

export default useRealtimePrices
