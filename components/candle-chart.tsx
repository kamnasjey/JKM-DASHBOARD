"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, IChartApi, CandlestickData, Time, LineStyle } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import type { Candle, ChartDrawing } from "@/lib/types"

interface CandleChartProps {
  symbol: string
  tf?: string
  limit?: number
  overlays?: ChartDrawing[]
  entry?: number
  sl?: number
  tp?: number
}

const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1"]

export function CandleChart({
  symbol,
  tf: initialTf = "M5",
  limit = 200,
  overlays = [],
  entry,
  sl,
  tp,
}: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const [selectedTf, setSelectedTf] = useState(initialTf)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])

  // Fetch candles when symbol or timeframe changes
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    api
      .candles(symbol, selectedTf, limit)
      .then((data) => {
        if (!mounted) return
        // Handle both array and {candles:[]} response shapes
        const candleArray = Array.isArray(data) ? data : data?.candles ?? []
        setCandles(candleArray)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        console.error("[CandleChart] Failed to fetch candles:", err)
        setError(err.message || "Candle өгөгдөл ачаалж чадсангүй")
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [symbol, selectedTf, limit])

  // Create / update chart when candles change
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return

    // Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candleSeries.setData(chartData)

    // Draw horizontal price lines for entry/sl/tp
    if (entry !== undefined) {
      candleSeries.createPriceLine({
        price: entry,
        color: "#3b82f6",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Entry",
      })
    }

    if (sl !== undefined) {
      candleSeries.createPriceLine({
        price: sl,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      })
    }

    if (tp !== undefined) {
      candleSeries.createPriceLine({
        price: tp,
        color: "#22c55e",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      })
    }

    // Draw overlay lines from chart_drawings
    overlays.forEach((drawing) => {
      if (drawing.kind === "line" && drawing.price !== undefined) {
        candleSeries.createPriceLine({
          price: drawing.price,
          color: "#f59e0b",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: drawing.label || drawing.type || "",
        })
      }
    })

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [candles, entry, sl, tp, overlays])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} Chart
          </CardTitle>
          <div className="flex gap-1">
            {TIMEFRAMES.map((t) => (
              <Button
                key={t}
                variant={selectedTf === t ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTf(t)}
                disabled={loading}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setSelectedTf(selectedTf)}>
              Дахин оролдох
            </Button>
          </div>
        ) : candles.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Candle өгөгдөл байхгүй</p>
          </div>
        ) : (
          <div ref={chartContainerRef} className="h-[400px] w-full" />
        )}
      </CardContent>
    </Card>
  )
}
