"use client"

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { IChartApi, ISeriesApi } from "lightweight-charts"
import type {
  ChartDrawingDoc,
  DrawingTool,
  ChartState,
  EntrySignal,
} from "./types"

interface ChartContextValue {
  // Chart references
  chartRef: React.MutableRefObject<IChartApi | null>
  seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>

  // State
  state: ChartState

  // Symbol & Timeframe
  setSymbol: (symbol: string) => void
  setTimeframe: (tf: string) => void

  // Drawing tool
  setActiveTool: (tool: DrawingTool) => void

  // Drawings management
  setDrawings: (drawings: ChartDrawingDoc[]) => void
  addDrawing: (drawing: ChartDrawingDoc) => void
  updateDrawing: (id: string, updates: Partial<ChartDrawingDoc>) => void
  removeDrawing: (id: string) => void
  clearAllDrawings: () => void

  // Drawing state
  setIsDrawing: (isDrawing: boolean) => void
  setSelectedDrawingId: (id: string | null) => void

  // Entry signals
  entrySignals: EntrySignal[]
  setEntrySignals: (signals: EntrySignal[]) => void
}

const ChartContext = createContext<ChartContextValue | null>(null)

interface ChartProviderProps {
  children: ReactNode
  initialSymbol?: string
  initialTimeframe?: string
}

export function ChartProvider({
  children,
  initialSymbol = "XAUUSD",
  initialTimeframe = "M5",
}: ChartProviderProps) {
  // Chart refs
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

  // Main state
  const [state, setState] = useState<ChartState>({
    symbol: initialSymbol,
    timeframe: initialTimeframe,
    activeTool: "cursor",
    drawings: [],
    isDrawing: false,
    selectedDrawingId: null,
  })

  // Entry signals
  const [entrySignals, setEntrySignals] = useState<EntrySignal[]>([])

  // Symbol & Timeframe
  const setSymbol = useCallback((symbol: string) => {
    setState(s => ({ ...s, symbol, drawings: [], selectedDrawingId: null }))
  }, [])

  const setTimeframe = useCallback((timeframe: string) => {
    setState(s => ({ ...s, timeframe, drawings: [], selectedDrawingId: null }))
  }, [])

  // Drawing tool
  const setActiveTool = useCallback((activeTool: DrawingTool) => {
    setState(s => ({ ...s, activeTool, selectedDrawingId: null }))
  }, [])

  // Drawings management
  const setDrawings = useCallback((drawings: ChartDrawingDoc[]) => {
    setState(s => ({ ...s, drawings }))
  }, [])

  const addDrawing = useCallback((drawing: ChartDrawingDoc) => {
    setState(s => ({ ...s, drawings: [drawing, ...s.drawings] }))
  }, [])

  const updateDrawing = useCallback(
    (id: string, updates: Partial<ChartDrawingDoc>) => {
      setState(s => ({
        ...s,
        drawings: s.drawings.map(d =>
          d.id === id ? ({ ...d, ...updates } as ChartDrawingDoc) : d
        ),
      }))
    },
    []
  )

  const removeDrawing = useCallback((id: string) => {
    setState(s => ({
      ...s,
      drawings: s.drawings.filter(d => d.id !== id),
      selectedDrawingId: s.selectedDrawingId === id ? null : s.selectedDrawingId,
    }))
  }, [])

  const clearAllDrawings = useCallback(() => {
    setState(s => ({ ...s, drawings: [], selectedDrawingId: null }))
  }, [])

  // Drawing state
  const setIsDrawing = useCallback((isDrawing: boolean) => {
    setState(s => ({ ...s, isDrawing }))
  }, [])

  const setSelectedDrawingId = useCallback((selectedDrawingId: string | null) => {
    setState(s => ({ ...s, selectedDrawingId }))
  }, [])

  return (
    <ChartContext.Provider
      value={{
        chartRef,
        seriesRef,
        state,
        setSymbol,
        setTimeframe,
        setActiveTool,
        setDrawings,
        addDrawing,
        updateDrawing,
        removeDrawing,
        clearAllDrawings,
        setIsDrawing,
        setSelectedDrawingId,
        entrySignals,
        setEntrySignals,
      }}
    >
      {children}
    </ChartContext.Provider>
  )
}

export function useChartContext() {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error("useChartContext must be used within ChartProvider")
  }
  return context
}
