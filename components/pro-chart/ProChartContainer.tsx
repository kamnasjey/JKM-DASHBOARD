"use client"

import { useEffect, useCallback, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChartProvider, useChartContext } from "./ChartContext"
import { ChartCanvas } from "./ChartCanvas"
import { ChartToolbar } from "./ChartToolbar"
import { useChartDrawings } from "@/hooks/use-chart-drawings"
import { useSignals } from "@/hooks/use-signals"
import type { EntrySignal, DrawingCreateInput } from "./types"

interface ProChartContainerProps {
  symbols: string[]
  initialSymbol?: string
  initialTimeframe?: string
  height?: number
  className?: string
}

/**
 * Main Pro Chart Container
 *
 * Orchestrates the chart, toolbar, and drawings.
 */
export function ProChartContainer({
  symbols,
  initialSymbol = "XAUUSD",
  initialTimeframe = "M5",
  height = 500,
  className = "",
}: ProChartContainerProps) {
  return (
    <ChartProvider
      initialSymbol={initialSymbol}
      initialTimeframe={initialTimeframe}
    >
      <ProChartInner
        symbols={symbols}
        height={height}
        className={className}
      />
    </ChartProvider>
  )
}

interface ProChartInnerProps {
  symbols: string[]
  height: number
  className: string
}

function ProChartInner({ symbols, height, className }: ProChartInnerProps) {
  const {
    state,
    setDrawings,
    addDrawing,
    removeDrawing: removeLocalDrawing,
    clearAllDrawings: clearLocalDrawings,
    setEntrySignals,
  } = useChartContext()

  const [refreshKey, setRefreshKey] = useState(0)

  // Drawings API hook
  const {
    drawings: apiDrawings,
    loading: drawingsLoading,
    fetchDrawings,
    createDrawing,
    deleteDrawing,
    clearAllDrawings,
  } = useChartDrawings({
    symbol: state.symbol,
    timeframe: state.timeframe,
  })

  // Signals hook for entry overlay
  const { signals } = useSignals({ symbol: state.symbol, limit: 10 })

  // Fetch drawings when symbol/timeframe changes
  useEffect(() => {
    fetchDrawings()
  }, [state.symbol, state.timeframe, fetchDrawings])

  // Sync API drawings to context
  useEffect(() => {
    setDrawings(apiDrawings)
  }, [apiDrawings, setDrawings])

  // Map signals to entry signals format
  useEffect(() => {
    const entrySignals: EntrySignal[] = signals
      .filter(s => s.entry && s.symbol?.toUpperCase() === state.symbol.toUpperCase())
      .slice(0, 5) // Limit to 5 most recent
      .map(s => ({
        id: s.signal_id,
        symbol: s.symbol,
        direction: s.direction === "BUY" || s.direction === "bullish" || s.direction === "long"
          ? "BUY"
          : "SELL",
        entry: s.entry!,
        sl: s.sl,
        tp: s.tp,
        rr: s.rr,
        outcome: s.outcome as EntrySignal["outcome"],
        createdAt: s.created_at,
      }))

    setEntrySignals(entrySignals)
  }, [signals, state.symbol, setEntrySignals])

  // Handle delete single drawing
  const handleDeleteDrawing = useCallback(async (id: string) => {
    const success = await deleteDrawing(id)
    if (success) {
      removeLocalDrawing(id)
    }
  }, [deleteDrawing, removeLocalDrawing])

  // Handle clear all drawings
  const handleClearAll = useCallback(async () => {
    const success = await clearAllDrawings()
    if (success) {
      clearLocalDrawings()
    }
  }, [clearAllDrawings, clearLocalDrawings])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    fetchDrawings()
  }, [fetchDrawings])

  // Handle drawing creation from canvas
  const handleDrawingComplete = useCallback(
    async (input: Omit<DrawingCreateInput, "symbol" | "timeframe">) => {
      const fullInput: DrawingCreateInput = {
        ...input,
        symbol: state.symbol,
        timeframe: state.timeframe,
      }

      const newDrawing = await createDrawing(fullInput)
      if (newDrawing) {
        addDrawing(newDrawing)
      }
    },
    [state.symbol, state.timeframe, createDrawing, addDrawing]
  )

  return (
    <Card className={`overflow-hidden ${className}`}>
      <ChartToolbar
        symbols={symbols}
        onClearAll={handleClearAll}
        onRefresh={handleRefresh}
        onDeleteDrawing={handleDeleteDrawing}
        loading={drawingsLoading}
      />
      <CardContent className="p-0">
        <ChartCanvas
          key={refreshKey}
          height={height}
          onDrawingCreate={handleDrawingComplete}
        />
      </CardContent>
    </Card>
  )
}
