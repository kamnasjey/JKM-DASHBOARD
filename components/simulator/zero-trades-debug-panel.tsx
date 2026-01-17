"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle,
  RefreshCw,
  Calendar,
  Clock,
  Shield,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DETECTOR_BY_ID, CATEGORY_INFO, type DetectorCategory } from "@/lib/detectors/catalog"

// Root cause type mapping to Mongolian labels
const ROOT_CAUSE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  gate_filtered: {
    icon: "🚦",
    label: "Gate блоклосон",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  no_triggers: {
    icon: "🎯",
    label: "Trigger илрээгүй",
    color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10",
  },
  no_confluence: {
    icon: "🔗",
    label: "Confluence хүрээгүй",
    color: "text-orange-500 border-orange-500/50 bg-orange-500/10",
  },
  no_data: {
    icon: "📊",
    label: "Дата олдсонгүй",
    color: "text-purple-500 border-purple-500/50 bg-purple-500/10",
  },
  no_setup: {
    icon: "📉",
    label: "Зах зээлд setup байгаагүй",
    color: "text-blue-500 border-blue-500/50 bg-blue-500/10",
  },
  detector_mismatch: {
    icon: "⚠",
    label: "Detector нэр mismatch",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
}

interface ZeroTradesDebugPanelProps {
  explainability?: {
    rootCause?: string
    explanation?: string
    severity?: string
    suggestions?: string[]
    debug?: {
      barsScanned?: number
      hitsPerDetector?: Record<string, number>
      gateBlocks?: Record<string, number>
      detectorsRequested?: string[]
      detectorsNormalized?: string[]
      detectorsImplemented?: string[]
      detectorsNotImplemented?: string[]
      detectorsUnknown?: string[]
    }
  }
  meta?: {
    detectorsRequested?: string[]
    detectorsNormalized?: string[]
    detectorsImplemented?: string[]
    detectorsNotImplemented?: string[]
    detectorsUnknown?: string[]
    simVersion?: string
  }
  onQuickFix?: (action: "normalize" | "extend_range" | "change_tf" | "disable_gates") => void
  onRerun?: () => void
  isRerunning?: boolean
}

export function ZeroTradesDebugPanel({
  explainability,
  meta,
  onQuickFix,
  onRerun,
  isRerunning,
}: ZeroTradesDebugPanelProps) {
  const [showHitmap, setShowHitmap] = useState(true)

  // Determine root cause label
  const rootCauseKey = explainability?.rootCause || "no_setup"
  const rootCauseInfo = ROOT_CAUSE_LABELS[rootCauseKey] || ROOT_CAUSE_LABELS["no_setup"]

  // Check if normalization would help (different counts)
  const needsNormalization = 
    meta?.detectorsRequested && 
    meta?.detectorsNormalized &&
    meta.detectorsRequested.length !== meta.detectorsNormalized.length

  // Check for unknown detectors
  const hasUnknown = meta?.detectorsUnknown && meta.detectorsUnknown.length > 0

  return (
    <Card className="border-orange-500/30 bg-orange-950/20">
      <CardContent className="pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-orange-500/20 shrink-0">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-orange-500 mb-1">
              Яагаад 0 арилжаа гарсан бэ?
            </h4>
            <p className="text-sm text-muted-foreground">
              {explainability?.explanation || 
                "Сонгосон detector-ууд болон хугацааны хүрээнд ямар ч сигнал илрээгүй байна."}
            </p>
          </div>
        </div>

        {/* Root Cause Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Үндсэн шалтгаан:</span>
          <Badge variant="outline" className={cn("text-xs", rootCauseInfo.color)}>
            {rootCauseInfo.icon} {rootCauseInfo.label}
          </Badge>
          {explainability?.debug?.barsScanned !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({explainability.debug.barsScanned.toLocaleString()} bar шалгасан)
            </span>
          )}
          {meta?.simVersion && (
            <Badge variant="secondary" className="text-[10px]">
              v{meta.simVersion}
            </Badge>
          )}
        </div>

        {/* Detector Hitmap Section */}
        <div className="space-y-3">
          <button
            onClick={() => setShowHitmap(!showHitmap)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            {showHitmap ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Detector Hitmap
          </button>

          {showHitmap && (
            <div className="space-y-4 pl-1">
              {/* Per-detector hit counts with categories */}
              {explainability?.debug?.hitsPerDetector && 
               Object.keys(explainability.debug.hitsPerDetector).length > 0 ? (
                <div className="space-y-3">
                  {(["gate", "trigger", "confluence"] as DetectorCategory[]).map(category => {
                    const catInfo = CATEGORY_INFO[category]
                    const hitsInCategory = Object.entries(explainability.debug!.hitsPerDetector!)
                      .filter(([det]) => {
                        const meta = DETECTOR_BY_ID.get(det)
                        return meta?.category === category
                      })
                    
                    if (hitsInCategory.length === 0) return null
                    
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{catInfo.icon}</span>
                          <span className="font-medium">{catInfo.labelMn}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pl-5">
                          {hitsInCategory.map(([det, count]) => {
                            const detMeta = DETECTOR_BY_ID.get(det)
                            const gateBlocks = explainability.debug?.gateBlocks?.[det]
                            
                            return (
                              <TooltipProvider key={det}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "flex items-center justify-between px-2 py-1.5 rounded-md border text-xs",
                                      (count as number) > 0 
                                        ? "border-green-500/30 bg-green-500/5" 
                                        : "border-muted bg-muted/20"
                                    )}>
                                      <span className="truncate mr-2">
                                        {detMeta?.labelShort || det}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {(count as number) > 0 ? (
                                          <span className="text-green-500 font-medium">✅ {count}</span>
                                        ) : (
                                          <span className="text-muted-foreground">⛔ 0</span>
                                        )}
                                        {gateBlocks && gateBlocks > 0 && (
                                          <span className="text-red-500 text-[10px]">
                                            🚫{gateBlocks}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="font-medium">{detMeta?.labelMn || det}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {detMeta?.descriptionMn || `Hit count: ${count}`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-md p-3">
                  <p className="flex items-center gap-2">
                    <span>ℹ️</span>
                    Энэ хувилбар hit tracking дэмжихгүй байна. Backend v2.4+ шаардлагатай.
                  </p>
                </div>
              )}

              {/* Gate blocks summary */}
              {explainability?.debug?.gateBlocks && 
               Object.keys(explainability.debug.gateBlocks).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <span>🚦</span>
                    Gate-ээс блоклогдсон
                  </p>
                  <div className="flex flex-wrap gap-2 pl-5">
                    {Object.entries(explainability.debug.gateBlocks).map(([gate, count]) => {
                      const gateMeta = DETECTOR_BY_ID.get(gate)
                      return (
                        <Badge 
                          key={gate} 
                          variant="outline" 
                          className="text-xs border-red-500/50 bg-red-500/10 text-red-500"
                        >
                          🚫 {gateMeta?.labelShort || gate}: {(count as number).toLocaleString()}
                        </Badge>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">
                    💡 Gate хэт олон блоклож байвал зах зээлийн нөхцөл таарахгүй байна.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestions */}
        {explainability?.suggestions && explainability.suggestions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-orange-500/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>💡</span>
              Зөвлөмж
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {explainability.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 1-Click Fixes */}
        {onQuickFix && (
          <div className="space-y-3 pt-3 border-t border-orange-500/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wrench className="h-3 w-3" />
              Түргэн засвар (1-Click)
            </p>
            <div className="flex flex-wrap gap-2">
              {needsNormalization && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-blue-500/30 hover:bg-blue-500/10"
                        onClick={() => onQuickFix("normalize")}
                      >
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        Нэр засах
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Detector нэрсийг нормализаци хийж дахин run хийнэ</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => onQuickFix("extend_range")}
                    >
                      <Calendar className="h-3 w-3 mr-1.5" />
                      90 хоног
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Хугацааны хүрээг 90 хоног болгож дахин run хийнэ</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-purple-500/30 hover:bg-purple-500/10"
                      onClick={() => onQuickFix("change_tf")}
                    >
                      <Clock className="h-3 w-3 mr-1.5" />
                      Зөвхөн 1H/4H
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Зөвхөн 1H, 4H таймфрэйм дээр run хийнэ</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => onQuickFix("disable_gates")}
                    >
                      <Shield className="h-3 w-3 mr-1.5" />
                      Gate унтраах
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>GATE_VOLATILITY, GATE_DRIFT_SENTINEL түр унтрааж run хийнэ</p>
                    <p className="text-[10px] text-muted-foreground">(Strategy хадгалагдахгүй)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {onRerun && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-8 ml-auto"
                  onClick={onRerun}
                  disabled={isRerunning}
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1.5", isRerunning && "animate-spin")} />
                  {isRerunning ? "Running..." : "Дахин run"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Fallback message if no explainability */}
        {!explainability && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Боломжит шалтгаанууд:</p>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">1.</span>
                Detector-ууд implement хийгдээгүй (backend-д байхгүй)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">2.</span>
                Сонгосон хугацаанд тохирох setup үүсээгүй
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">3.</span>
                Gate detector бүх сигналыг блоклосон
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
