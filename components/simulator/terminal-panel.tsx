"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X, Minus } from "lucide-react"

interface TerminalPanelProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
  onClose?: () => void
  onMinimize?: () => void
}

export function TerminalPanel({
  title,
  subtitle,
  children,
  className,
  headerActions,
  onClose,
  onMinimize,
}: TerminalPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#1E2749] bg-[#0D1229] overflow-hidden",
        "transition-all duration-200",
        "hover:border-[#2A3556]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2749] bg-[#0A0E27]">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F0F4FF]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[#A0A8C0]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 rounded hover:bg-[#1E2749] transition-colors"
            >
              <Minus className="h-3.5 w-3.5 text-[#6C7BA8]" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#1E2749] transition-colors"
            >
              <X className="h-3.5 w-3.5 text-[#6C7BA8]" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">{children}</div>
    </div>
  )
}
