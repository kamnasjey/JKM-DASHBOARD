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

function normalizeSignals(input: any[]): Signal[] {
  if (!Array.isArray(input)) return []

  return input
    .map((raw: any) => {
      if (!raw || typeof raw !== "object") return null
      const symbol = typeof raw.symbol === "string" ? raw.symbol : null
      const direction = typeof raw.direction === "string" ? raw.direction : null
      if (!symbol || !direction) return null

      const createdAtRaw = raw.created_at ?? raw.createdAt ?? raw.timestamp ?? raw.ts
      let created_at: number | undefined
      if (typeof createdAtRaw === "number") {
        created_at = createdAtRaw
      } else if (typeof createdAtRaw === "string") {
        const ts = Date.parse(createdAtRaw)
        if (!Number.isNaN(ts)) created_at = Math.floor(ts / 1000)
      }

      return {
        signal_id: typeof raw.signal_id === "string" ? raw.signal_id : undefined,
        symbol,
        tf: typeof raw.tf === "string" ? raw.tf : (typeof raw.timeframe === "string" ? raw.timeframe : undefined),
        direction,
        entry: typeof raw.entry === "number" ? raw.entry : undefined,
        sl: typeof raw.sl === "number" ? raw.sl : undefined,
        tp: typeof raw.tp === "number" ? raw.tp : undefined,
        rr: typeof raw.rr === "number" ? raw.rr : undefined,
        score: typeof raw.score === "number" ? raw.score : undefined,
        detectors: Array.isArray(raw.detectors) ? raw.detectors : undefined,
        timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
        status: typeof raw.status === "string" ? raw.status : undefined,
        ...(created_at !== undefined ? { created_at } : {}),
      } as Signal & { created_at?: number }
    })
    .filter(Boolean) as Signal[]
}

export function useWebSocketSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [newSignals, setNewSignals] = useState<Signal[]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 10

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
      setReconnectAttempts(0) // Reset on successful connection
    }

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        
        if (data.type === "initial") {
          console.log("[signals-ws] Received initial signals:", data.signals?.length)
          setSignals(normalizeSignals(data.signals || []))
          setTotalCount(data.total || 0)
          setLastUpdate(new Date())
        } else if (data.type === "new_signals") {
          console.log("[signals-ws] Received new signals:", data.signals?.length)
          const normalized = normalizeSignals(data.signals || [])
          setSignals(prev => [...prev, ...normalized])
          setNewSignals(normalized)
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
      
      // Exponential backoff reconnect (5s, 10s, 20s, 40s... max 5min)
      setReconnectAttempts(prev => {
        const attempts = prev + 1
        if (attempts <= maxReconnectAttempts) {
          const delay = Math.min(5000 * Math.pow(2, attempts - 1), 300000)
          console.log(`[signals-ws] Reconnect attempt ${attempts} in ${delay/1000}s...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.log("[signals-ws] Max reconnect attempts reached")
          setError("Холболт тасарсан. Хуудсыг дахин ачаална уу.")
        }
        return attempts
      })
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
