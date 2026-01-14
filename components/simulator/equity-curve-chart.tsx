"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface EquityCurveChartProps {
  trades: Array<{
    entry_ts: number
    r: number
    outcome: "TP" | "SL"
  }>
  className?: string
}

export function EquityCurveChart({ trades, className }: EquityCurveChartProps) {
  const equityData = React.useMemo(() => {
    if (trades.length === 0) return []

    // Sort by entry time
    const sorted = [...trades].sort((a, b) => a.entry_ts - b.entry_ts)

    // Build cumulative equity curve
    let cumulative = 0
    const data = sorted.map((trade, index) => {
      cumulative += trade.r
      return {
        trade: index + 1,
        date: new Date(trade.entry_ts * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        equity: parseFloat(cumulative.toFixed(2)),
        r: trade.r,
        outcome: trade.outcome,
      }
    })

    // Add starting point
    return [{ trade: 0, date: "Start", equity: 0, r: 0, outcome: null }, ...data]
  }, [trades])

  const maxEquity = Math.max(...equityData.map((d) => d.equity), 0)
  const minEquity = Math.min(...equityData.map((d) => d.equity), 0)
  const finalEquity = equityData[equityData.length - 1]?.equity || 0
  const isPositive = finalEquity >= 0

  if (trades.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-[300px] text-[#6C7BA8] text-sm">
          No trade data available
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={equityData}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="equityGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D084" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D084" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="equityGradientNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4757" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF4757" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2749" />
          <XAxis
            dataKey="trade"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6C7BA8", fontSize: 10 }}
            tickFormatter={(value) => (value === 0 ? "" : `#${value}`)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6C7BA8", fontSize: 10 }}
            tickFormatter={(value) => `${value}R`}
            domain={[Math.floor(minEquity) - 1, Math.ceil(maxEquity) + 1]}
          />
          <ReferenceLine y={0} stroke="#6C7BA8" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0D1229",
              border: "1px solid #1E2749",
              borderRadius: "8px",
              color: "#F0F4FF",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#A0A8C0" }}
            formatter={(value: number, name: string) => {
              if (name === "equity") return [`${value}R`, "Cumulative"]
              return [value, name]
            }}
            labelFormatter={(label) =>
              label === 0 ? "Starting Point" : `Trade #${label}`
            }
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={isPositive ? "#00D084" : "#FF4757"}
            strokeWidth={2}
            fill={isPositive ? "url(#equityGradientPos)" : "url(#equityGradientNeg)"}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
