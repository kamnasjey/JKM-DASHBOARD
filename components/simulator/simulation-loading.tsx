"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface SimulationLoadingProps {
  symbol: string
  timeframe: string
  candleCount?: number
  className?: string
}

export function SimulationLoading({
  symbol,
  timeframe,
  candleCount,
  className,
}: SimulationLoadingProps) {
  const [elapsed, setElapsed] = React.useState(0)
  const [progress, setProgress] = React.useState(0)

  // Estimate time based on candle count (rough: 20000 candles/sec throughput)
  const estimatedSeconds = candleCount
    ? Math.min(30, Math.ceil(candleCount / 20000))
    : 10

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
      setProgress((p) => Math.min(p + 100 / estimatedSeconds, 95))
    }, 1000)

    return () => clearInterval(interval)
  }, [estimatedSeconds])

  return (
    <div
      className={cn(
        "rounded-lg border border-[#1E2749] bg-[#0D1229] p-8",
        className
      )}
    >
      <div className="flex flex-col items-center text-center">
        {/* Spinner */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-[#3B82F6]/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-[#0A0E27] border-2 border-[#3B82F6] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#3B82F6] animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F0F4FF] mb-2">
          Simulating Performance...
        </h3>

        {/* Context */}
        <p className="text-xs text-[#A0A8C0] mb-4">
          Backtesting{" "}
          {candleCount ? (
            <span className="text-[#3B82F6] font-medium">
              {candleCount.toLocaleString()} candles
            </span>
          ) : (
            "candles"
          )}{" "}
          on{" "}
          <span className="text-[#F0F4FF] font-medium">{symbol}</span>{" "}
          <span className="text-[#6C7BA8]">{timeframe}</span>
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-3">
          <Progress
            value={progress}
            className="h-2 bg-[#1E2749] [&>div]:bg-[#3B82F6]"
          />
        </div>

        {/* Time info */}
        <div className="flex items-center gap-4 text-xs text-[#6C7BA8]">
          <span>Elapsed: {elapsed}s</span>
          <span>•</span>
          <span>Est. time: ~{estimatedSeconds}s</span>
        </div>
      </div>
    </div>
  )
}
