"use client"

import { TrendingUp, Users, Target, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DetectorPreset } from "@/lib/detectors/catalog"

interface TemplateCardProps {
  preset: DetectorPreset
  onUse: (preset: DetectorPreset) => void
  onPreview?: (preset: DetectorPreset) => void
  disabled?: boolean
  compact?: boolean
}

export function TemplateCard({
  preset,
  onUse,
  onPreview,
  disabled = false,
  compact = false,
}: TemplateCardProps) {
  const { performance, recommendedSettings, difficulty, isPopular } = preset

  const difficultyColors = {
    beginner: "bg-green-500/10 text-green-600 border-green-500/30",
    intermediate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    advanced: "bg-red-500/10 text-red-600 border-red-500/30",
  }

  const difficultyLabels = {
    beginner: "Эхлэгч",
    intermediate: "Дунд",
    advanced: "Ахисан",
  }

  const confidenceColors = {
    high: "text-green-600",
    medium: "text-yellow-600",
    low: "text-red-600",
  }

  if (compact) {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onUse(preset)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{preset.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{preset.nameEn}</span>
                {isPopular && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    🔥
                  </Badge>
                )}
              </div>
              {performance && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-green-600">{performance.winrate}%</span>
                  <span>•</span>
                  <span>{performance.totalTrades} trades</span>
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "transition-all hover:border-primary/50 hover:shadow-md",
        disabled && "opacity-50"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{preset.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{preset.nameEn}</h3>
                {isPopular && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    🔥 Popular
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{preset.nameMn}</p>
            </div>
          </div>
          {difficulty && (
            <Badge
              variant="outline"
              className={cn("text-[10px]", difficultyColors[difficulty])}
            >
              {difficultyLabels[difficulty]}
            </Badge>
          )}
        </div>

        {/* Performance Stats */}
        {performance && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-muted/50 rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="font-bold text-green-600">
                        {performance.winrate}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Backtest win rate ({performance.period || "historical"})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="font-bold">{performance.totalTrades}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Trades</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total trades in backtest</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="h-3 w-3 text-purple-600" />
                      <span className="font-bold">{performance.profitFactor.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">PF</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Profit Factor (gross profit / gross loss)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {preset.descriptionMn || preset.descEn}
        </p>

        {/* Detectors Preview */}
        <div className="flex flex-wrap gap-1">
          {preset.detectors.slice(0, 4).map(id => (
            <Badge key={id} variant="secondary" className="text-[10px] px-1.5">
              {id.replace(/_/g, " ")}
            </Badge>
          ))}
          {preset.detectors.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5">
              +{preset.detectors.length - 4}
            </Badge>
          )}
        </div>

        {/* Recommended Settings */}
        {recommendedSettings && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>RR: {recommendedSettings.minRR}+</span>
            <span>•</span>
            <span>{recommendedSettings.symbols.slice(0, 2).join(", ")}</span>
            <span>•</span>
            <span>{recommendedSettings.timeframes.join(", ")}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onUse(preset)}
            disabled={disabled}
          >
            Хэрэглэх
          </Button>
          {onPreview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(preset)}
              disabled={disabled}
            >
              Дэлгэрэнгүй
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TemplateCard
