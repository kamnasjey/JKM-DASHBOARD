"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface RRDistributionChartProps {
  trades: Array<{
    r: number
    outcome: "TP" | "SL"
  }>
  className?: string
}

export function RRDistributionChart({
  trades,
  className,
}: RRDistributionChartProps) {
  // Group trades by R ranges
  const distribution = React.useMemo(() => {
    const ranges = [
      { range: "<-2R", min: -Infinity, max: -2 },
      { range: "-2R to -1R", min: -2, max: -1 },
      { range: "-1R to 0R", min: -1, max: 0 },
      { range: "0R to 1R", min: 0, max: 1 },
      { range: "1R to 2R", min: 1, max: 2 },
      { range: "2R to 3R", min: 2, max: 3 },
      { range: ">3R", min: 3, max: Infinity },
    ]

    return ranges.map(({ range, min, max }) => {
      const inRange = trades.filter((t) => t.r >= min && t.r < max)
      const wins = inRange.filter((t) => t.outcome === "TP").length
      const losses = inRange.filter((t) => t.outcome === "SL").length

      return {
        range,
        count: inRange.length,
        wins,
        losses,
        color: min >= 0 ? "#00D084" : "#FF4757",
      }
    })
  }, [trades])

  if (trades.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-[200px] text-[#6C7BA8] text-sm">
          No trade data available
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={distribution}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1E2749"
            vertical={false}
          />
          <XAxis
            dataKey="range"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6C7BA8", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6C7BA8", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0D1229",
              border: "1px solid #1E2749",
              borderRadius: "8px",
              color: "#F0F4FF",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#A0A8C0" }}
            formatter={(value: number, name: string) => [
              value,
              name === "count" ? "Trades" : name,
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
