"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TRADING_STYLES, type TradingStyle, type TradingStyleMeta } from "@/lib/detectors/trading-styles"

interface StyleSelectorProps {
  /** Currently selected style */
  selected: TradingStyle | null
  /** Callback when style is selected */
  onSelect: (style: TradingStyle) => void
  /** Disabled state */
  disabled?: boolean
}

function StyleCard({
  style,
  isSelected,
  onSelect,
  disabled,
}: {
  style: TradingStyleMeta
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
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

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
        isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onSelect()}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <span className="text-4xl">{style.icon}</span>

          {/* Title */}
          <div>
            <h3 className="font-semibold text-sm">{style.labelEn}</h3>
            <p className="text-xs text-muted-foreground">{style.labelMn}</p>
          </div>

          {/* Difficulty Badge */}
          <Badge
            variant="outline"
            className={cn("text-[10px]", difficultyColors[style.difficulty])}
          >
            {difficultyLabels[style.difficulty]}
          </Badge>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {style.descMn}
          </p>

          {/* Best Conditions */}
          <div className="flex flex-wrap gap-1 justify-center">
            {style.bestConditions.slice(0, 2).map((condition, i) => (
              <Badge key={i} variant="secondary" className="text-[9px] px-1.5">
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StyleSelector({
  selected,
  onSelect,
  disabled = false,
}: StyleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Та ямар төрлийн арилжаа хийх вэ?</h3>
        <p className="text-sm text-muted-foreground">
          Trading style сонговол тохирох detector-уудыг санал болгоно
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {TRADING_STYLES.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            isSelected={selected === style.id}
            onSelect={() => onSelect(style.id)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Selected Style Details */}
      {selected && (
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
          {(() => {
            const style = TRADING_STYLES.find(s => s.id === selected)
            if (!style) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{style.icon}</span>
                  <div>
                    <h4 className="font-semibold">{style.labelEn}</h4>
                    <p className="text-xs text-muted-foreground">{style.labelMn}</p>
                  </div>
                </div>
                <p className="text-sm">{style.descEn}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Gates:</p>
                    <p>{style.recommendedGates.length}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Triggers:</p>
                    <p>{style.recommendedTriggers.length}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Confluence:</p>
                    <p>{style.recommendedConfluence.length}</p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export { TRADING_STYLES }
export type { TradingStyle, TradingStyleMeta }
