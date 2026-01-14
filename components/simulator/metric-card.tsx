"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TrendDirection = "up" | "down" | "neutral"

interface MetricCardProps {
  label: string
  value: string | number
  subValue?: string
  trend?: TrendDirection
  trendValue?: string
  tooltip?: string
  variant?: "default" | "success" | "danger" | "warning" | "info"
  className?: string
  onClick?: () => void
}

const variantStyles = {
  default: "border-[#1E2749] hover:border-[#2A3556]",
  success: "border-[#00D084]/30 hover:border-[#00D084]/50",
  danger: "border-[#FF4757]/30 hover:border-[#FF4757]/50",
  warning: "border-[#FFA502]/30 hover:border-[#FFA502]/50",
  info: "border-[#3B82F6]/30 hover:border-[#3B82F6]/50",
}

const valueColors = {
  default: "text-[#F0F4FF]",
  success: "text-[#00D084]",
  danger: "text-[#FF4757]",
  warning: "text-[#FFA502]",
  info: "text-[#3B82F6]",
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  tooltip,
  variant = "default",
  className,
  onClick,
}: MetricCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  const trendColor =
    trend === "up"
      ? "text-[#00D084]"
      : trend === "down"
      ? "text-[#FF4757]"
      : "text-[#6C7BA8]"

  const content = (
    <div
      className={cn(
        "rounded-lg border bg-[#0D1229] p-4 transition-all duration-200",
        "hover:shadow-lg hover:shadow-[#3B82F6]/5",
        variantStyles[variant],
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Label */}
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#6C7BA8] mb-2">
        {label}
      </p>

      {/* Value Row */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <span className={cn("text-2xl font-bold", valueColors[variant])}>
            {value}
          </span>
          {subValue && (
            <span className="text-[11px] text-[#A0A8C0] mt-0.5">{subValue}</span>
          )}
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className={cn("flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            {trendValue && (
              <span className="text-xs font-medium">{trendValue}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-[#1E2749] text-[#F0F4FF] border-[#2A3556]"
          >
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}
