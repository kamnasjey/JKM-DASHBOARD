"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Maximize2, Minimize2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import type { SignalPayloadPublicV1 } from "@/lib/types"

interface TradingChartProps {
  symbol: string
  signals?: SignalPayloadPublicV1[]
  onSymbolChange?: (symbol: string) => void
  className?: string
}

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  displayTime: string
  color: string
}

export function TradingChart({
  symbol,
  signals = [],
  className = "",
}: TradingChartProps) {
  const [loading, setLoading] = useState(true)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [timeframe, setTimeframe] = useState("M5")
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load candle data
  const loadCandles = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    try {
      const data = await api.candles(symbol, timeframe, 100)
      const rawCandles = data?.candles || data || []

      const processed: CandleData[] = rawCandles
        .map((c: any) => {
          let timestamp: number
          if (typeof c.time === "number") {
            timestamp = c.time
          } else if (typeof c.ts === "number") {
            timestamp = c.ts
          } else if (c.timestamp) {
            timestamp =
              typeof c.timestamp === "number"
                ? c.timestamp
                : Math.floor(new Date(c.timestamp).getTime() / 1000)
          } else {
            return null
          }

          const open = Number(c.open || c.o)
          const high = Number(c.high || c.h)
          const low = Number(c.low || c.l)
          const close = Number(c.close || c.c)
          const isBullish = close >= open

          return {
            time: timestamp,
            open,
            high,
            low,
            close,
            displayTime: new Date(timestamp * 1000).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            color: isBullish ? "#22c55e" : "#ef4444",
          }
        })
        .filter(Boolean)
        .sort((a: CandleData, b: CandleData) => a.time - b.time)

      setCandles(processed)
    } catch (err) {
      console.error("Failed to load candles:", err)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    loadCandles()
  }, [loadCandles])

  // Get signal lines for current symbol
  const symbolSignals = signals.filter(
    (s) => s.symbol?.toUpperCase() === symbol?.toUpperCase()
  )

  // Calculate price range for Y axis
  const priceRange = candles.length > 0
    ? {
        min: Math.min(...candles.map((c) => c.low)) * 0.9995,
        max: Math.max(...candles.map((c) => c.high)) * 1.0005,
      }
    : { min: 0, max: 100 }

  const timeframes = [
    { value: "M1", label: "1m" },
    { value: "M5", label: "5m" },
    { value: "M15", label: "15m" },
    { value: "M30", label: "30m" },
    { value: "H1", label: "1H" },
    { value: "H4", label: "4H" },
    { value: "D", label: "1D" },
  ]

  // Custom candlestick shape for recharts
  const CandlestickShape = (props: any) => {
    const { x, y, width, height, payload, index } = props
    if (!payload || !candles.length) return null

    const candle = candles[index]
    if (!candle) return null

    const { open, close, high, low, color } = candle

    // Calculate dimensions
    const candleWidth = Math.max(width * 0.6, 2)
    const candleX = x + (width - candleWidth) / 2

    // Y scale
    const yScale = (price: number) => {
      const range = priceRange.max - priceRange.min
      if (range === 0) return y + height / 2
      return y + height - ((price - priceRange.min) / range) * height
    }

    const bodyTop = yScale(Math.max(open, close))
    const bodyBottom = yScale(Math.min(open, close))
    const bodyHeight = Math.max(bodyBottom - bodyTop, 1)

    const wickTop = yScale(high)
    const wickBottom = yScale(low)
    const wickX = x + width / 2

    return (
      <g>
        {/* Wick */}
        <line
          x1={wickX}
          y1={wickTop}
          x2={wickX}
          y2={wickBottom}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
          stroke={color}
          strokeWidth={0.5}
        />
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload

    return (
      <div className="rounded-lg border bg-popover p-3 shadow-lg">
        <p className="text-xs text-muted-foreground">{data.displayTime}</p>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">O:</span>
          <span className="font-mono">{data.open?.toFixed(5)}</span>
          <span className="text-muted-foreground">H:</span>
          <span className="font-mono">{data.high?.toFixed(5)}</span>
          <span className="text-muted-foreground">L:</span>
          <span className="font-mono">{data.low?.toFixed(5)}</span>
          <span className="text-muted-foreground">C:</span>
          <span className={`font-mono ${data.close >= data.open ? "text-green-500" : "text-red-500"}`}>
            {data.close?.toFixed(5)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card className={`${className} ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg font-bold">{symbol}</span>
            <Badge variant="secondary">{timeframe}</Badge>
            {loading && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadCandles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div style={{ height: isFullscreen ? "calc(100vh - 150px)" : "500px" }}>
          {candles.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={candles}
                margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42, 46, 57, 0.5)" />
                <XAxis
                  dataKey="displayTime"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={{ stroke: "rgba(42, 46, 57, 0.5)" }}
                  tickLine={{ stroke: "rgba(42, 46, 57, 0.5)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[priceRange.min, priceRange.max]}
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v) => v.toFixed(3)}
                  axisLine={{ stroke: "rgba(42, 46, 57, 0.5)" }}
                  tickLine={{ stroke: "rgba(42, 46, 57, 0.5)" }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Signal lines */}
                {symbolSignals.slice(0, 3).map((signal, idx) => (
                  <g key={signal.signal_id || idx}>
                    {signal.entry && (
                      <ReferenceLine
                        y={signal.entry}
                        stroke={signal.direction === "BUY" ? "#22c55e" : "#ef4444"}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{
                          value: `Entry ${signal.entry.toFixed(5)}`,
                          fill: signal.direction === "BUY" ? "#22c55e" : "#ef4444",
                          fontSize: 10,
                          position: "right",
                        }}
                      />
                    )}
                    {signal.sl && (
                      <ReferenceLine
                        y={signal.sl}
                        stroke="#f97316"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        label={{
                          value: `SL`,
                          fill: "#f97316",
                          fontSize: 10,
                          position: "right",
                        }}
                      />
                    )}
                    {signal.tp && (
                      <ReferenceLine
                        y={signal.tp}
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        label={{
                          value: `TP`,
                          fill: "#3b82f6",
                          fontSize: 10,
                          position: "right",
                        }}
                      />
                    )}
                  </g>
                ))}

                {/* Candlestick bars */}
                <Bar
                  dataKey="high"
                  shape={<CandlestickShape />}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {loading ? "Ачааллаж байна..." : "Мэдээлэл олдсонгүй"}
            </div>
          )}
        </div>

        {/* Legend */}
        {symbolSignals.length > 0 && (
          <div className="border-t p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Сигналууд:
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 bg-green-500" />
                <span className="text-xs">Entry (BUY)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 bg-red-500" />
                <span className="text-xs">Entry (SELL)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t border-dashed border-orange-500" />
                <span className="text-xs">SL</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t border-dashed border-blue-500" />
                <span className="text-xs">TP</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
