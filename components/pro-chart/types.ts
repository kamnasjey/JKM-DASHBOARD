import type { IChartApi, ISeriesApi, Time } from "lightweight-charts"

/**
 * Pro Chart Types
 *
 * Types for the TradingView-like chart component
 */

// Drawing tool types
export type DrawingTool =
  | "cursor"
  | "horizontal_line"
  | "trend_line"
  | "fibonacci"
  | "rectangle"

export type LineStyle = "solid" | "dashed" | "dotted"

// Base drawing interface
export interface DrawingBase {
  id: string
  symbol: string
  timeframe: string
  tool: Exclude<DrawingTool, "cursor">
  color: string
  lineWidth: number
  lineStyle: LineStyle
  label?: string | null
  visible: boolean
  locked: boolean
  createdAt: string
  updatedAt: string
}

// Horizontal line drawing
export interface HorizontalLineDrawing extends DrawingBase {
  tool: "horizontal_line"
  price: number
}

// Trend line drawing
export interface TrendLineDrawing extends DrawingBase {
  tool: "trend_line"
  startTime: number
  startPrice: number
  endTime: number
  endPrice: number
}

// Fibonacci retracement drawing
export interface FibonacciDrawing extends DrawingBase {
  tool: "fibonacci"
  startTime: number
  startPrice: number
  endTime: number
  endPrice: number
  levels: number[]
}

// Rectangle/box drawing
export interface RectangleDrawing extends DrawingBase {
  tool: "rectangle"
  startTime: number
  startPrice: number
  endTime: number
  endPrice: number
  fillColor?: string | null
}

// Union type for all drawings
export type ChartDrawingDoc =
  | HorizontalLineDrawing
  | TrendLineDrawing
  | FibonacciDrawing
  | RectangleDrawing

// Chart state
export interface ChartState {
  symbol: string
  timeframe: string
  activeTool: DrawingTool
  drawings: ChartDrawingDoc[]
  isDrawing: boolean
  selectedDrawingId: string | null
}

// Timeframe options
export const TIMEFRAMES = [
  { value: "M5", label: "M5", minutes: 5 },
  { value: "M15", label: "M15", minutes: 15 },
  { value: "M30", label: "M30", minutes: 30 },
  { value: "H1", label: "H1", minutes: 60 },
  { value: "H4", label: "H4", minutes: 240 },
] as const

export type Timeframe = typeof TIMEFRAMES[number]["value"]

// Default Fibonacci levels
export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

// Default colors for drawings
export const DEFAULT_COLORS = {
  horizontal_line: "#f59e0b", // amber
  trend_line: "#3b82f6", // blue
  fibonacci: "#8b5cf6", // purple
  rectangle: "#22c55e", // green
} as const

// Entry overlay signal
export interface EntrySignal {
  id: string
  symbol: string
  direction: "BUY" | "SELL"
  entry: number
  sl?: number
  tp?: number
  rr?: number
  outcome?: "win" | "loss" | "pending"
  createdAt: number
}

// Chart canvas props
export interface ChartCanvasProps {
  symbol: string
  timeframe: string
  drawings: ChartDrawingDoc[]
  entrySignals?: EntrySignal[]
  onDrawingComplete?: (drawing: Omit<ChartDrawingDoc, "id" | "createdAt" | "updatedAt">) => void
  onDrawingSelect?: (id: string | null) => void
  onDrawingUpdate?: (id: string, updates: Partial<ChartDrawingDoc>) => void
  activeTool: DrawingTool
  isDrawing: boolean
  onDrawingStart?: () => void
  onDrawingEnd?: () => void
  className?: string
}

// Drawing creation input (before persisting)
export interface DrawingCreateInput {
  symbol: string
  timeframe: string
  tool: Exclude<DrawingTool, "cursor">
  color: string
  lineWidth: number
  lineStyle: LineStyle
  label?: string
  visible?: boolean
  locked?: boolean
  // Tool-specific
  price?: number
  startTime?: number
  startPrice?: number
  endTime?: number
  endPrice?: number
  levels?: number[]
  fillColor?: string
}

// API response types
export interface DrawingsResponse {
  ok: boolean
  drawings: ChartDrawingDoc[]
  count: number
}

export interface DrawingResponse {
  ok: boolean
  drawing: ChartDrawingDoc
}

// Chart ref type
export interface ChartRef {
  chart: IChartApi | null
  candleSeries: ISeriesApi<"Candlestick"> | null
}
