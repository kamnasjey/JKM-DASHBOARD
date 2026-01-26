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

// Root cause type mapping to English/Mongolian labels
const ROOT_CAUSE_LABELS: Record<string, { icon: string; labelEn: string; labelMn: string; color: string }> = {
  MARKET_CLOSED: {
    icon: "📅",
    labelEn: "Market Closed (Weekend)",
    labelMn: "Зах зээл хаалттай",
    color: "text-blue-500 border-blue-500/50 bg-blue-500/10",
  },
  GATES_BLOCKED_ALL: {
    icon: "🚦",
    labelEn: "Blocked by Gate",
    labelMn: "Gate блоклосон",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  NO_TRIGGER_HITS: {
    icon: "🎯",
    labelEn: "No Triggers Found",
    labelMn: "Trigger илрээгүй",
    color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10",
  },
  NO_DATA_IN_RANGE: {
    icon: "📊",
    labelEn: "No Data Found",
    labelMn: "Дата олдсонгүй",
    color: "text-purple-500 border-purple-500/50 bg-purple-500/10",
  },
  MARKETDATA_NO_CANDLES: {
    icon: "📉",
    labelEn: "No Candle Data",
    labelMn: "Candle дата байхгүй",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  MARKETDATA_LOW_COVERAGE: {
    icon: "📉",
    labelEn: "Low Data Coverage",
    labelMn: "Дата бага",
    color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10",
  },
  NO_SETUPS_IN_RANGE: {
    icon: "📉",
    labelEn: "No Market Setup",
    labelMn: "Зах зээлд setup байгаагүй",
    color: "text-blue-500 border-blue-500/50 bg-blue-500/10",
  },
  DETECTOR_NORMALIZATION_MISMATCH: {
    icon: "⚠",
    labelEn: "Detector Mismatch",
    labelMn: "Detector нэр mismatch",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  // Legacy lowercase mappings for backwards compatibility
  gate_filtered: {
    icon: "🚦",
    labelEn: "Blocked by Gate",
    labelMn: "Gate блоклосон",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  no_triggers: {
    icon: "🎯",
    labelEn: "No Triggers Found",
    labelMn: "Trigger илрээгүй",
    color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10",
  },
  no_confluence: {
    icon: "🔗",
    labelEn: "Confluence Not Met",
    labelMn: "Confluence хүрээгүй",
    color: "text-orange-500 border-orange-500/50 bg-orange-500/10",
  },
  no_data: {
    icon: "📊",
    labelEn: "No Data Found",
    labelMn: "Дата олдсонгүй",
    color: "text-purple-500 border-purple-500/50 bg-purple-500/10",
  },
  no_setup: {
    icon: "📉",
    labelEn: "No Market Setup",
    labelMn: "Зах зээлд setup байгаагүй",
    color: "text-blue-500 border-blue-500/50 bg-blue-500/10",
  },
  detector_mismatch: {
    icon: "⚠",
    labelEn: "Detector Mismatch",
    labelMn: "Detector нэр mismatch",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  NO_EXPLAIN_FROM_BACKEND: {
    icon: "❓",
    labelEn: "No Explanation From Backend",
    labelMn: "Backend тайлбар өгөөгүй",
    color: "text-gray-500 border-gray-500/50 bg-gray-500/10",
  },
  BACKEND_UNREACHABLE: {
    icon: "🔌",
    labelEn: "Backend Unreachable",
    labelMn: "Backend холбогдохгүй",
    color: "text-red-500 border-red-500/50 bg-red-500/10",
  },
  LOW_COVERAGE: {
    icon: "📉",
    labelEn: "Insufficient Data Coverage",
    labelMn: "Дата хангалтгүй",
    color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10",
  },
  RR_FILTER: {
    icon: "📏",
    labelEn: "RR Filter",
    labelMn: "RR шүүлтүүр",
    color: "text-orange-500 border-orange-500/50 bg-orange-500/10",
  },
  INTERNAL_ERROR: {
    icon: "💥",
    labelEn: "Internal Error",
    labelMn: "Дотоод алдаа",
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
    dashboardVersion?: string
    elapsedMs?: number
  }
  dataCoverage?: {
    from?: string
    to?: string
    expectedBars?: number
    actualBars?: number
    missingPct?: number
  }
  onQuickFix?: (action: "normalize" | "extend_range" | "change_tf" | "disable_gates") => void
  onRerun?: () => void
  isRerunning?: boolean
}

export function ZeroTradesDebugPanel({
  explainability,
  meta,
  dataCoverage,
  onQuickFix,
  onRerun,
  isRerunning,
}: ZeroTradesDebugPanelProps) {
  const [showHitmap, setShowHitmap] = useState(true)
  const formatSuggestion = (input: any) => {
    if (typeof input === "string") return input
    if (input && typeof input === "object") {
      return input.suggestion || input.title || input.message || JSON.stringify(input)
    }
    return String(input)
  }

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
  
  // Check for data coverage issues
  const hasDataGap = dataCoverage && dataCoverage.missingPct !== undefined && dataCoverage.missingPct >= 20

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
              Why 0 Trades?
            </h4>
            <p className="text-sm text-muted-foreground">
              {explainability?.explanation || 
                "No signals found for the selected detectors and time range."}
            </p>
          </div>
        </div>

        {/* Root Cause Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Root Cause:</span>
          <Badge variant="outline" className={cn("text-xs", rootCauseInfo.color)}>
            {rootCauseInfo.icon} {rootCauseInfo.labelEn}
          </Badge>
          {explainability?.debug?.barsScanned !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({explainability.debug.barsScanned.toLocaleString()} bars scanned)
            </span>
          )}
          {meta?.simVersion && (
            <Badge variant="secondary" className="text-[10px]">
              sim:{meta.simVersion}
            </Badge>
          )}
          {meta?.dashboardVersion && (
            <Badge variant="secondary" className="text-[10px]">
              dash:{meta.dashboardVersion}
            </Badge>
          )}
        </div>
        
        {/* Data Coverage Warning */}
        {hasDataGap && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-2">
              <span className="text-yellow-500">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Insufficient Data Coverage ({dataCoverage.missingPct?.toFixed(1)}% missing)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only {dataCoverage.actualBars} of {dataCoverage.expectedBars} expected bars found.
                </p>
                {onQuickFix && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => onQuickFix("extend_range")}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Try 90 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => onQuickFix("change_tf")}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Try 1H/4H
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                          <span className="font-medium">{catInfo.labelEn}</span>
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
                                    <p className="font-medium">{detMeta?.labelEn || det}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {detMeta?.descEn || `Hit count: ${count}`}
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
                    Hit tracking not supported in this version. Requires Backend v2.4+
                  </p>
                </div>
              )}

              {/* Gate blocks summary */}
              {explainability?.debug?.gateBlocks && 
               Object.keys(explainability.debug.gateBlocks).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <span>🚦</span>
                    Blocked by Gate
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
                    💡 Too many Gate blocks may indicate market conditions don't match.
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
              Suggestions
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {explainability.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {formatSuggestion(s)}
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
              Quick Fixes (1-Click)
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
                        Fix Names
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Normalize detector names and re-run</p>
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
                      90 Days
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Extend time range to 90 days and re-run</p>
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
                      Try 1H/4H Only
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Run on 1H and 4H timeframes only</p>
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
                      Disable Gates
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Temporarily disable GATE_VOLATILITY, GATE_DRIFT_SENTINEL</p>
                    <p className="text-[10px] text-muted-foreground">(Strategy won't be saved)</p>
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
                  {isRerunning ? "Running..." : "Re-run"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Fallback message if no explainability */}
        {!explainability && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Possible reasons:</p>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">1.</span>
                Detectors not implemented (missing in backend)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">2.</span>
                No matching setup in selected time range
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">3.</span>
                Gate detector blocked all signals
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
