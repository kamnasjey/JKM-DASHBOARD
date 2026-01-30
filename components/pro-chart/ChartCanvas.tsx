"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  CandlestickSeries,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  LineStyle,
  CrosshairMode,
} from "lightweight-charts"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import type { Candle } from "@/lib/types"
import { useCandleResampler, getM5CandlesNeeded } from "@/hooks/use-candle-resampler"
import { useChartContext } from "./ChartContext"
import type { ChartDrawingDoc, DrawingCreateInput } from "./types"
import { DEFAULT_COLORS, DEFAULT_FIB_LEVELS } from "./types"

interface ChartCanvasProps {
  className?: string
  height?: number
  onDrawingCreate?: (input: Omit<DrawingCreateInput, "symbol" | "timeframe">) => void
}

// Drawing start point for two-point tools
interface DrawingStartPoint {
  time: number
  price: number
}

export function ChartCanvas({
  className = "",
  height = 500,
  onDrawingCreate,
}: ChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { chartRef, seriesRef, state, entrySignals, setActiveTool, setIsDrawing } = useChartContext()

  const [m5Candles, setM5Candles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Two-point drawing state
  const [drawingStartPoint, setDrawingStartPoint] = useState<DrawingStartPoint | null>(null)
  const previewLineRef = useRef<any>(null)

  // Resample M5 candles to target timeframe
  const candles = useCandleResampler(m5Candles, state.timeframe)

  // Fetch candles when symbol changes
  const fetchCandles = useCallback(async () => {
    if (!state.symbol) return

    setLoading(true)
    setError(null)

    try {
      // Calculate how many M5 candles we need for 200 candles of target TF
      const m5Count = getM5CandlesNeeded(state.timeframe, 200)
      const response = await api.candles(state.symbol, "M5", Math.min(m5Count, 2000))

      // Handle both array and {candles:[]} response shapes
      const candleArray = Array.isArray(response)
        ? response
        : response?.candles ?? []

      // Normalize and validate candle data
      const rawCandles: Candle[] = candleArray
        .map((c: any) => {
          let time: number
          if (typeof c.time === "number") {
            time = c.time
          } else if (typeof c.ts === "number") {
            time = c.ts
          } else if (c.timestamp) {
            time = typeof c.timestamp === "number"
              ? c.timestamp
              : Math.floor(new Date(c.timestamp).getTime() / 1000)
          } else {
            return null
          }

          const open = Number(c.open || c.o)
          const high = Number(c.high || c.h)
          const low = Number(c.low || c.l)
          const close = Number(c.close || c.c)

          // Skip invalid candles
          if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return null
          if (open <= 0 || high <= 0 || low <= 0 || close <= 0) return null
          if (high < low || high < open || high < close) return null
          if (low > open || low > close) return null

          return {
            time,
            open,
            high,
            low,
            close,
            volume: Number(c.volume || c.v || 0),
          }
        })
        .filter((c: Candle | null): c is Candle => c !== null)
        .sort((a: Candle, b: Candle) => a.time - b.time)

      // Filter out abnormal price jumps (>30% from previous candle)
      const validated: Candle[] = []
      for (let i = 0; i < rawCandles.length; i++) {
        const candle = rawCandles[i]
        if (i === 0) {
          validated.push(candle)
          continue
        }

        const prev = validated[validated.length - 1]
        const priceDiff = Math.abs(candle.close - prev.close) / prev.close

        // Skip if price jumped more than 30% (likely data error)
        if (priceDiff > 0.30) {
          console.warn(`[ChartCanvas] Skipping candle with abnormal jump: ${prev.close} -> ${candle.close}`)
          continue
        }

        validated.push(candle)
      }

      console.log(`[ChartCanvas] Loaded ${rawCandles.length} candles, validated ${validated.length}`)
      setM5Candles(validated)
    } catch (err: any) {
      console.error("[ChartCanvas] Failed to fetch candles:", err)
      setError(err?.message || "Failed to load chart data")
    } finally {
      setLoading(false)
    }
  }, [state.symbol, state.timeframe])

  // Fetch on mount and symbol/timeframe change
  useEffect(() => {
    fetchCandles()
  }, [fetchCandles])

  // Handle ESC to cancel drawing in progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawingStartPoint) {
        // Cancel current drawing
        setDrawingStartPoint(null)
        setIsDrawing(false)

        // Remove preview line
        if (previewLineRef.current && seriesRef.current) {
          seriesRef.current.removePriceLine(previewLineRef.current)
          previewLineRef.current = null
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [drawingStartPoint, setIsDrawing, seriesRef])

  // Create and update chart
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return

    // Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    // Create chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Create candlestick series using lightweight-charts v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    seriesRef.current = candleSeries

    // Set data
    const chartData: CandlestickData<Time>[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candleSeries.setData(chartData)

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    }

    // Handle click for drawing tools
    const handleClick = (param: any) => {
      if (!onDrawingCreate || !seriesRef.current) return

      // Only handle clicks when a drawing tool is selected
      if (state.activeTool === "cursor") return

      // Get time from click
      const clickTime = param.time as number || Math.floor(Date.now() / 1000)

      // Get price from click position
      const candleData = param.seriesData?.get(candleSeries)
      const price = candleData?.close

      if (!price && param.point) {
        // Try to get price from Y coordinate
        const priceFromY = candleSeries.coordinateToPrice(param.point.y)
        if (priceFromY !== null) {
          handleDrawingAtPrice(priceFromY, clickTime)
        }
      } else if (price) {
        handleDrawingAtPrice(price, clickTime)
      }
    }

    const handleDrawingAtPrice = (price: number, time: number) => {
      if (!onDrawingCreate) return

      // Single-click tools (horizontal_line)
      if (state.activeTool === "horizontal_line") {
        onDrawingCreate({
          tool: "horizontal_line",
          price,
          color: DEFAULT_COLORS.horizontal_line,
          lineWidth: 1,
          lineStyle: "solid",
          visible: true,
          locked: false,
        })
        setActiveTool("cursor")
        return
      }

      // Two-point tools (trend_line, fibonacci, rectangle)
      const isTwoPointTool = ["trend_line", "fibonacci", "rectangle"].includes(state.activeTool)

      if (isTwoPointTool) {
        if (!drawingStartPoint) {
          // First click - set start point
          setDrawingStartPoint({ time, price })
          setIsDrawing(true)

          // Create preview line
          if (seriesRef.current && state.activeTool === "trend_line") {
            previewLineRef.current = seriesRef.current.createPriceLine({
              price,
              color: DEFAULT_COLORS.trend_line,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: false,
              title: "Drawing...",
            })
          }
        } else {
          // Second click - complete the drawing
          const startTime = drawingStartPoint.time
          const startPrice = drawingStartPoint.price
          const endTime = time
          const endPrice = price

          // Remove preview line
          if (previewLineRef.current && seriesRef.current) {
            seriesRef.current.removePriceLine(previewLineRef.current)
            previewLineRef.current = null
          }

          if (state.activeTool === "trend_line") {
            onDrawingCreate({
              tool: "trend_line",
              startTime,
              startPrice,
              endTime,
              endPrice,
              color: DEFAULT_COLORS.trend_line,
              lineWidth: 1,
              lineStyle: "solid",
              visible: true,
              locked: false,
            })
          } else if (state.activeTool === "fibonacci") {
            onDrawingCreate({
              tool: "fibonacci",
              startTime,
              startPrice,
              endTime,
              endPrice,
              levels: DEFAULT_FIB_LEVELS,
              color: DEFAULT_COLORS.fibonacci,
              lineWidth: 1,
              lineStyle: "solid",
              visible: true,
              locked: false,
            })
          } else if (state.activeTool === "rectangle") {
            onDrawingCreate({
              tool: "rectangle",
              startTime,
              startPrice,
              endTime,
              endPrice,
              color: DEFAULT_COLORS.rectangle,
              fillColor: DEFAULT_COLORS.rectangle + "20", // 20% opacity
              lineWidth: 1,
              lineStyle: "solid",
              visible: true,
              locked: false,
            })
          }

          // Reset drawing state
          setDrawingStartPoint(null)
          setIsDrawing(false)
          setActiveTool("cursor")
        }
      }
    }

    chart.subscribeClick(handleClick)

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.unsubscribeClick(handleClick)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [candles, height, chartRef, seriesRef, state.activeTool, onDrawingCreate, setActiveTool, drawingStartPoint, setIsDrawing])

  // Update drawings when they change
  useEffect(() => {
    if (!seriesRef.current) return

    // Clear existing price lines (drawings)
    // Note: lightweight-charts doesn't have a clear method, so we recreate

    state.drawings.forEach(drawing => {
      if (!drawing.visible) return

      // Horizontal line
      if (drawing.tool === "horizontal_line") {
        const hLine = drawing as ChartDrawingDoc & { price: number }
        seriesRef.current?.createPriceLine({
          price: hLine.price,
          color: hLine.color,
          lineWidth: hLine.lineWidth as 1 | 2 | 3 | 4,
          lineStyle: hLine.lineStyle === "dashed"
            ? LineStyle.Dashed
            : hLine.lineStyle === "dotted"
              ? LineStyle.Dotted
              : LineStyle.Solid,
          axisLabelVisible: true,
          title: hLine.label || "",
        })
      }

      // Trend line - show start and end prices as dashed lines
      if (drawing.tool === "trend_line") {
        const tLine = drawing as ChartDrawingDoc & { startPrice: number; endPrice: number }
        seriesRef.current?.createPriceLine({
          price: tLine.startPrice,
          color: tLine.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Trend Start",
        })
        seriesRef.current?.createPriceLine({
          price: tLine.endPrice,
          color: tLine.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Trend End",
        })
      }

      // Fibonacci - draw level lines
      if (drawing.tool === "fibonacci") {
        const fib = drawing as ChartDrawingDoc & { startPrice: number; endPrice: number; levels: number[] }
        const range = fib.endPrice - fib.startPrice
        const fibLevels = fib.levels || DEFAULT_FIB_LEVELS

        fibLevels.forEach((level: number) => {
          const price = fib.startPrice + range * level
          seriesRef.current?.createPriceLine({
            price,
            color: fib.color,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `${(level * 100).toFixed(1)}%`,
          })
        })
      }

      // Rectangle - draw top and bottom boundary
      if (drawing.tool === "rectangle") {
        const rect = drawing as ChartDrawingDoc & { startPrice: number; endPrice: number }
        const topPrice = Math.max(rect.startPrice, rect.endPrice)
        const bottomPrice = Math.min(rect.startPrice, rect.endPrice)

        seriesRef.current?.createPriceLine({
          price: topPrice,
          color: rect.color,
          lineWidth: rect.lineWidth as 1 | 2 | 3 | 4,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "▢ Top",
        })
        seriesRef.current?.createPriceLine({
          price: bottomPrice,
          color: rect.color,
          lineWidth: rect.lineWidth as 1 | 2 | 3 | 4,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "▢ Bottom",
        })
      }
    })
  }, [state.drawings, seriesRef])

  // Update entry signals overlay
  useEffect(() => {
    if (!seriesRef.current || entrySignals.length === 0) return

    entrySignals.forEach(signal => {
      // Entry line
      if (signal.entry) {
        seriesRef.current?.createPriceLine({
          price: signal.entry,
          color: signal.outcome === "win"
            ? "#22c55e"
            : signal.outcome === "loss"
              ? "#ef4444"
              : signal.direction === "BUY"
                ? "#3b82f6"
                : "#f97316",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Entry ${signal.direction}`,
        })
      }

      // SL line
      if (signal.sl) {
        seriesRef.current?.createPriceLine({
          price: signal.sl,
          color: signal.outcome === "loss" ? "#ef4444" : "#f97316",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "SL",
        })
      }

      // TP line
      if (signal.tp) {
        seriesRef.current?.createPriceLine({
          price: signal.tp,
          color: signal.outcome === "win" ? "#22c55e" : "#10b981",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "TP",
        })
      }
    })
  }, [entrySignals, seriesRef])

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-card ${className}`}
        style={{ height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-card ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={fetchCandles}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (candles.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-card ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full bg-card ${className}`}
      style={{ height }}
    />
  )
}
