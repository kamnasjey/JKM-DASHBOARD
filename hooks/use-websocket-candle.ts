"use client"

import { useState, useEffect, useRef } from "react"

export function useWebSocketCandle(symbol: string, tf = "5m") {
  const [latestCandle, setLatestCandle] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!symbol) return

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/markets/${symbol}?tf=${tf}`

    console.log("[v0] Connecting to WebSocket:", wsUrl)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[v0] WebSocket connected")
      setConnected(true)
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
    }

    ws.onclose = () => {
      console.log("[v0] WebSocket closed")
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [symbol, tf])

  return { latestCandle, connected, lastUpdate }
}
