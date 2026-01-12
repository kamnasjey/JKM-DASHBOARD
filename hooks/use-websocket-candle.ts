"use client"

import { useState, useEffect, useRef } from "react"

export function useWebSocketCandle(symbol: string, tf = "5m") {
  const [latestCandle, setLatestCandle] = useState<any>(null)
  const [enabled, setEnabled] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!symbol) return

    const envBase = process.env.NEXT_PUBLIC_WS_URL
    const isBrowser = typeof window !== "undefined"
    const isLocalhost = isBrowser && window.location.hostname === "localhost"

    // In production, defaulting to ws://localhost:8000 is almost always wrong.
    // If NEXT_PUBLIC_WS_URL isn't set, skip connecting and surface a clear hint.
    if (!envBase && !isLocalhost) {
      // WS is optional in production; backend can handle realtime + caching.
      setEnabled(false)
      setConnected(false)
      setError(null)
      return
    }

    setEnabled(true)

    const base = envBase || "ws://localhost:8000"
    const wsUrl = `${base}/ws/markets/${symbol}?tf=${tf}`

    console.log("[v0] Connecting to WebSocket:", wsUrl)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[v0] WebSocket connected")
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[v0] WebSocket message received:", data)
        setLatestCandle(data)
        setLastUpdate(new Date())
      } catch (err) {
        console.error("[v0] Failed to parse WebSocket message:", err)
      }
    }

    ws.onerror = (error) => {
      console.error("[v0] WebSocket error:", error)
      setConnected(false)
      setError("WebSocket холболтын алдаа")
    }

    ws.onclose = () => {
      console.log("[v0] WebSocket closed")
      setConnected(false)
      setError("WebSocket холболт хаагдлаа")
    }

    return () => {
      ws.close()
    }
  }, [symbol, tf])

  return { latestCandle, enabled, connected, lastUpdate, error }
}
