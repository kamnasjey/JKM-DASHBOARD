"use client"

import { useState, useCallback } from "react"
import type { ChartDrawingDoc, DrawingCreateInput } from "@/components/pro-chart/types"

interface UseChartDrawingsOptions {
  symbol: string
  timeframe: string
}

interface UseChartDrawingsReturn {
  drawings: ChartDrawingDoc[]
  loading: boolean
  error: string | null
  fetchDrawings: () => Promise<void>
  createDrawing: (input: DrawingCreateInput) => Promise<ChartDrawingDoc | null>
  updateDrawing: (
    id: string,
    updates: Partial<ChartDrawingDoc>
  ) => Promise<ChartDrawingDoc | null>
  deleteDrawing: (id: string) => Promise<boolean>
  clearAllDrawings: () => Promise<boolean>
}

/**
 * Hook for managing chart drawings via API
 */
export function useChartDrawings({
  symbol,
  timeframe,
}: UseChartDrawingsOptions): UseChartDrawingsReturn {
  const [drawings, setDrawings] = useState<ChartDrawingDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch drawings for current symbol/timeframe
  const fetchDrawings = useCallback(async () => {
    if (!symbol || !timeframe) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/user-drawings?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setDrawings(data.drawings || [])
    } catch (err: any) {
      console.error("[useChartDrawings] fetchDrawings error:", err)
      setError(err.message || "Failed to load drawings")
      setDrawings([])
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  // Create a new drawing
  const createDrawing = useCallback(
    async (input: DrawingCreateInput): Promise<ChartDrawingDoc | null> => {
      try {
        const res = await fetch("/api/user-drawings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || data.details || `HTTP ${res.status}`)
        }

        const data = await res.json()
        const newDrawing = data.drawing as ChartDrawingDoc

        // Add to local state
        setDrawings(prev => [newDrawing, ...prev])

        return newDrawing
      } catch (err: any) {
        console.error("[useChartDrawings] createDrawing error:", err)
        setError(err.message || "Failed to create drawing")
        return null
      }
    },
    []
  )

  // Update an existing drawing
  const updateDrawing = useCallback(
    async (
      id: string,
      updates: Partial<ChartDrawingDoc>
    ): Promise<ChartDrawingDoc | null> => {
      try {
        const res = await fetch(`/api/user-drawings/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        const data = await res.json()
        const updatedDrawing = data.drawing as ChartDrawingDoc

        // Update local state
        setDrawings(prev =>
          prev.map(d => (d.id === id ? updatedDrawing : d))
        )

        return updatedDrawing
      } catch (err: any) {
        console.error("[useChartDrawings] updateDrawing error:", err)
        setError(err.message || "Failed to update drawing")
        return null
      }
    },
    []
  )

  // Delete a drawing
  const deleteDrawing = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/user-drawings/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Remove from local state
      setDrawings(prev => prev.filter(d => d.id !== id))

      return true
    } catch (err: any) {
      console.error("[useChartDrawings] deleteDrawing error:", err)
      setError(err.message || "Failed to delete drawing")
      return false
    }
  }, [])

  // Clear all drawings for current symbol/timeframe
  const clearAllDrawings = useCallback(async (): Promise<boolean> => {
    if (!symbol || !timeframe) return false

    try {
      const res = await fetch(
        `/api/user-drawings?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
        { method: "DELETE" }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Clear local state
      setDrawings([])

      return true
    } catch (err: any) {
      console.error("[useChartDrawings] clearAllDrawings error:", err)
      setError(err.message || "Failed to clear drawings")
      return false
    }
  }, [symbol, timeframe])

  return {
    drawings,
    loading,
    error,
    fetchDrawings,
    createDrawing,
    updateDrawing,
    deleteDrawing,
    clearAllDrawings,
  }
}
