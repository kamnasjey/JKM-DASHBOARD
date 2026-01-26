"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Copy, Check } from "lucide-react"
import { StatusPill } from "./status-pill"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

interface Trade {
  entry_ts: number
  exit_ts: number
  direction: "BUY" | "SELL"
  entry: number
  sl: number
  tp: number
  outcome: "TP" | "SL"
  r: number
  duration_bars: number
  detector: string
}

interface TradesTableProps {
  trades: Trade[]
  className?: string
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(price: number) {
  if (price > 100) return price.toFixed(2)
  if (price > 1) return price.toFixed(4)
  return price.toFixed(5)
}

export function TradesTable({ trades, className }: TradesTableProps) {
  const { toast } = useToast()
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast({
        title: "Copied!",
        description: "Value copied to clipboard",
      })
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      })
    }
  }

  if (trades.length === 0) {
    return (
      <div className={cn("rounded-lg border border-[#1E2749] bg-[#0D1229] p-8", className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#1E2749] flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-[#6C7BA8]" />
          </div>
          <h3 className="text-sm font-medium text-[#F0F4FF] mb-1">
            No entries found
          </h3>
          <p className="text-xs text-[#6C7BA8] max-w-[280px]">
            No trades were generated in the selected period. Try extending the
            date range or adjusting detector settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-[#1E2749]", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E2749] bg-[#0A0E27]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Date
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Direction
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Entry
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              SL
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              TP
            </th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Outcome
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">R</TooltipTrigger>
                  <TooltipContent side="top" className="bg-[#1E2749] text-[#F0F4FF] border-[#2A3556]">
                    <p className="text-xs">Risk-Reward result (positive = profit)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6C7BA8]">
              Detector
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2749]">
          {trades.map((trade, index) => (
            <tr
              key={index}
              className={cn(
                "transition-colors duration-150",
                index % 2 === 0 ? "bg-[#0D1229]" : "bg-[#0A0E27]",
                "hover:bg-[#1E2749]/50"
              )}
            >
              <td className="px-4 py-3 text-xs text-[#A0A8C0] whitespace-nowrap">
                {formatDate(trade.entry_ts)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    trade.direction === "BUY" ? "text-[#00D084]" : "text-[#FF4757]"
                  )}
                >
                  {trade.direction === "BUY" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {trade.direction}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-xs text-[#F0F4FF] font-mono">
                {formatPrice(trade.entry)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-[#FF4757] font-mono">
                {formatPrice(trade.sl)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-[#00D084] font-mono">
                {formatPrice(trade.tp)}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusPill status={trade.outcome} />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => copyToClipboard(`${trade.r >= 0 ? "+" : ""}${trade.r.toFixed(2)}R`, index)}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-bold transition-colors",
                    trade.r >= 0 ? "text-[#00D084]" : "text-[#FF4757]",
                    "hover:opacity-80"
                  )}
                >
                  {trade.r >= 0 ? "+" : ""}
                  {trade.r.toFixed(2)}R
                  {copiedIndex === index ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                  )}
                </button>
              </td>
              <td className="px-4 py-3 text-right text-xs text-[#A0A8C0]">
                {trade.duration_bars} bars
              </td>
              <td className="px-4 py-3 text-xs text-[#6C7BA8] truncate max-w-[120px]">
                {typeof trade.detector === "string" ? trade.detector : "unknown"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
