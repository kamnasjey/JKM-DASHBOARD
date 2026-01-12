"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface Signal {
  signal_id?: string
  symbol: string
  tf: string
  direction: string
  entry: number
  sl: number
  tp: number
  rr?: number
  score?: number
  detectors?: string[]
  timestamp?: string
  status?: string
}

interface WebSocketMessage {
  type: "initial" | "new_signals" | "heartbeat"
  signals?: Signal[]
  total?: number
  ts?: number
}

export function useWebSocketSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [newSignals, setNewSignals] = useState<Signal[]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    const envBase = process.env.NEXT_PUBLIC_WS_URL
    const isBrowser = typeof window !== "undefined"
    const isLocalhost = isBrowser && window.location.hostname === "localhost"

    // In production, skip if WS URL not configured
    if (!envBase && !isLocalhost) {
      setConnected(false)
      setError(null)
      return
    }

    const base = envBase || "ws://localhost:8000"
    const wsUrl = `${base}/ws/signals`

    console.log("[signals-ws] Connecting to:", wsUrl)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[signals-ws] Connected")
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        
        if (data.type === "initial") {
          console.log("[signals-ws] Received initial signals:", data.signals?.length)
          setSignals(data.signals || [])
          setTotalCount(data.total || 0)
          setLastUpdate(new Date())
        } else if (data.type === "new_signals") {
          console.log("[signals-ws] Received new signals:", data.signals?.length)
          setSignals(prev => [...prev, ...(data.signals || [])])
          setNewSignals(data.signals || [])
          setTotalCount(data.total || 0)
          setLastUpdate(new Date())
          
          // Clear newSignals after 10 seconds (for notification purposes)
          setTimeout(() => setNewSignals([]), 10000)
        } else if (data.type === "heartbeat") {
          // Heartbeat received, connection is alive
          setLastUpdate(new Date())
        }
      } catch (err) {
        console.error("[signals-ws] Failed to parse message:", err)
      }
    }

    ws.onerror = (error) => {
      console.error("[signals-ws] Error:", error)
      setConnected(false)
      setError("WebSocket холболтын алдаа")
    }

    ws.onclose = () => {
      console.log("[signals-ws] Closed")
      setConnected(false)
      
      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[signals-ws] Attempting reconnect...")
        connect()
      }, 5000)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  // Function to clear new signals notification
  const clearNewSignals = useCallback(() => {
    setNewSignals([])
  }, [])

  return {
    signals,
    newSignals,
    connected,
    lastUpdate,
    error,
    totalCount,
    clearNewSignals,
  }
}
