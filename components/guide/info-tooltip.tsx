"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useLanguage } from "@/contexts/language-context"

interface InfoTooltipProps {
  textMn: string
  textEn: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function InfoTooltip({ textMn, textEn, side = "top", className }: InfoTooltipProps) {
  const { lang } = useLanguage()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={`inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors ${className || ""}`}>
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-64 text-xs leading-relaxed">
        {lang === "mn" ? textMn : textEn}
      </TooltipContent>
    </Tooltip>
  )
}
