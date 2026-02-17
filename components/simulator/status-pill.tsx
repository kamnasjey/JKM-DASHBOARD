"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Target, X, Clock } from "lucide-react"

type Status = "TP" | "SL" | "PENDING" | "WIN" | "LOSS"

interface StatusPillProps {
  status: string
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

const statusConfig: Record<
  Status,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  TP: {
    label: "TP HIT",
    bg: "bg-[#00D084]/15",
    text: "text-[#00D084]",
    icon: Target,
  },
  WIN: {
    label: "WIN",
    bg: "bg-[#00D084]/15",
    text: "text-[#00D084]",
    icon: Target,
  },
  SL: {
    label: "SL HIT",
    bg: "bg-[#FF4757]/15",
    text: "text-[#FF4757]",
    icon: X,
  },
  LOSS: {
    label: "LOSS",
    bg: "bg-[#FF4757]/15",
    text: "text-[#FF4757]",
    icon: X,
  },
  PENDING: {
    label: "PENDING",
    bg: "bg-[#FFA502]/15",
    text: "text-[#FFA502]",
    icon: Clock,
  },
}

export function StatusPill({
  status,
  className,
  showIcon = true,
  size = "sm",
}: StatusPillProps) {
  const config = statusConfig[status as Status] || statusConfig.PENDING
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className
      )}
    >
      {showIcon && (
        <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      )}
      {config.label}
    </span>
  )
}
