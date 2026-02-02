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

// Fallback HTTP polling interval (5 seconds)
const POLL_INTERVAL_MS = 5000
// Max WebSocket reconnect attempts before switching to polling
const MAX_WS_ATTEMPTS = 3

export function useWebSocketSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [newSignals, setNewSignals] = useState<Signal[]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [mode, setMode] = useState<"websocket" | "polling">("websocket")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)
  const lastSignalCountRef = useRef(0)

  // HTTP Polling fallback
  const pollSignals = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_VPS_API_URL || "https://api.jkmcopilot.com"
      const res = await fetch(`${apiBase}/api/signals?limit=50`, {
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        console.warn("[signals-poll] HTTP error:", res.status)
        return
      }

      const data = await res.json()
      const signalsList = Array.isArray(data) ? data : (data.signals || [])
      const normalized = normalizeSignals(signalsList)

      // Check for new signals
      if (normalized.length > lastSignalCountRef.current && lastSignalCountRef.current > 0) {
        const newCount = normalized.length - lastSignalCountRef.current
        const newOnes = normalized.slice(-newCount)
        setNewSignals(newOnes)
        setTimeout(() => setNewSignals([]), 10000)
      }

      lastSignalCountRef.current = normalized.length
      setSignals(normalized)
      setTotalCount(normalized.length)
      setLastUpdate(new Date())
      setConnected(true) // Mark as "connected" even in polling mode
      setError(null)

    } catch (err) {
      console.warn("[signals-poll] Fetch error:", err)
      // Don't set error - just skip this poll cycle
    }
  }, [])

  // Start polling mode
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return // Already polling

    console.log("[signals] Switching to HTTP polling mode")
    setMode("polling")

    // Initial fetch
    pollSignals()

    // Set up interval
    pollIntervalRef.current = setInterval(pollSignals, POLL_INTERVAL_MS)
  }, [pollSignals])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // WebSocket connection
  const connect = useCallback(() => {
    const envBase = process.env.NEXT_PUBLIC_WS_URL
    const isBrowser = typeof window !== "undefined"
    const isLocalhost = isBrowser && window.location.hostname === "localhost"

    // If no WS URL configured, go straight to polling
    if (!envBase && !isLocalhost) {
      console.log("[signals-ws] No WS URL configured, using HTTP polling")
      startPolling()
      return
    }

    const base = envBase || "ws://localhost:8000"
    const wsUrl = `${base}/ws/signals`

    console.log("[signals-ws] Connecting to:", wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Connection timeout - if not connected in 5 seconds, try polling
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("[signals-ws] Connection timeout, switching to polling")
          ws.close()
          startPolling()
        }
      }, 5000)

      ws.onopen = () => {
        clearTimeout(connectTimeout)
        console.log("[signals-ws] Connected")
        setConnected(true)
        setError(null)
        setMode("websocket")
        // NOTE: Don't reset reconnectAttempts here - only reset after receiving actual data
        // This prevents infinite loops when connection opens but immediately closes (code 1006)
        stopPolling() // Stop polling if it was running
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)

          if (data.type === "initial") {
            console.log("[signals-ws] Received initial signals:", data.signals?.length)
            setSignals(normalizeSignals(data.signals || []))
            setTotalCount(data.total || 0)
            setLastUpdate(new Date())
            setReconnectAttempts(0)
          } else if (data.type === "new_signals") {
            console.log("[signals-ws] Received new signals:", data.signals?.length)
            const normalized = normalizeSignals(data.signals || [])
            setSignals(prev => [...prev, ...normalized])
            setNewSignals(normalized)
            setTotalCount(data.total || 0)
            setLastUpdate(new Date())
            setReconnectAttempts(0)

            setTimeout(() => setNewSignals([]), 10000)
          } else if (data.type === "heartbeat") {
            setLastUpdate(new Date())
            setReconnectAttempts(0)
          }
        } catch (err) {
          console.error("[signals-ws] Failed to parse message:", err)
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectTimeout)
        console.error("[signals-ws] Error:", error)
        setConnected(false)
      }

      ws.onclose = (event) => {
        clearTimeout(connectTimeout)
        console.log("[signals-ws] Closed, code:", event.code)
        setConnected(false)

        if (!shouldReconnectRef.current) return
        if (event.code === 1000) return

        setReconnectAttempts(prev => {
          const attempts = prev + 1

          // After MAX_WS_ATTEMPTS, switch to polling permanently
          if (attempts >= MAX_WS_ATTEMPTS) {
            console.log("[signals-ws] Max attempts reached, switching to HTTP polling")
            startPolling()
            return attempts
          }

          // Exponential backoff reconnect
          const delay = Math.min(2000 * Math.pow(2, attempts - 1), 30000)
          console.log(`[signals-ws] Reconnect attempt ${attempts} in ${delay/1000}s...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)

          return attempts
        })
      }
    } catch (err) {
      console.error("[signals-ws] Failed to create WebSocket:", err)
      startPolling()
    }
  }, [startPolling, stopPolling])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      shouldReconnectRef.current = false
      stopPolling()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, stopPolling])

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
    mode, // "websocket" or "polling" - UI can show this
    reconnectAttempts, // How many times we've tried to reconnect
  }
}
