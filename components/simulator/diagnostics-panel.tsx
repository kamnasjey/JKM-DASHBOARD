"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DETECTOR_BY_ID } from "@/lib/detectors/catalog"

interface DiagnosticRun {
  ts: string
  requestId: string
  strategyId: string
  strategyName: string
  symbols: string[]
  range: { from: string; to: string }
  timeframe: string
  demoMode: boolean
  detectors: {
    requested: string[]
    normalized: string[]
    countRequested: number
    countNormalized: number
  }
  result: {
    ok: boolean
    entries: number | null
    winrate: number | null
  }
  backend: {
    simVersion: string
    implemented: string[]
    notImplemented: string[]
    unknown: string[]
  }
  explainability: {
    rootCause?: string
    explanation?: string
    severity?: string
    suggestions?: string[]
    debug?: any
  } | null
  warnings: string[]
}

interface DiagnosticsResponse {
  ok: boolean
  count: number
  runs: DiagnosticRun[]
  environment: {
    origin: string
    vercelEnv: string
    gitCommit: string
    timestamp: string
  }
  message: string
}

export function DiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DiagnosticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
  const formatWarning = (input: any) => {
    if (typeof input === "string") return input
    if (input && typeof input === "object") {
      return input.message || input.reasonText || input.suggestion || JSON.stringify(input)
    }
    return String(input)
  }

  async function fetchDiagnostics() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/diagnostics/simulator")
      if (!res.ok) throw new Error("Failed to fetch diagnostics")
      const json = await res.json()
      setData(json)
      setSelectedRunIndex(0)
    } catch (err: any) {
      setError(err.message || "Failed to load diagnostics")
    } finally {
      setLoading(false)
    }
  }

  // Fetch when opened
  useEffect(() => {
    if (isOpen && !data && !loading) {
      fetchDiagnostics()
    }
  }, [isOpen])

  const selectedRun = data?.runs?.[selectedRunIndex]

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span>🔍</span>
                Diagnostics (сүүлийн 10 run)
              </CardTitle>
              <div className="flex items-center gap-2">
                {data?.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {data.count} run
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Refresh button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                DevTools шаардлагагүй – бүх мэдээлэл энд харагдана
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDiagnostics}
                disabled={loading}
                className="text-xs h-7"
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
                Шинэчлэх
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 rounded-md p-3">
                {error}
              </div>
            )}

            {/* No runs */}
            {data?.count === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Simulator run хийгдээгүй байна. Эхлээд simulation run хийнэ үү.
              </div>
            )}

            {/* Run selector tabs */}
            {data && data.runs.length > 0 && (
              <>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {data.runs.map((run, idx) => (
                    <button
                      key={run.requestId}
                      onClick={() => setSelectedRunIndex(idx)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-md text-xs transition-colors",
                        idx === selectedRunIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {run.result.ok && run.result.entries && run.result.entries > 0 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : run.result.ok && run.result.entries === 0 ? (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>#{data.runs.length - idx}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected run details */}
                {selectedRun && (
                  <div className="space-y-4 text-sm">
                    {/* Basic info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Огноо</p>
                        <p className="font-mono text-xs">
                          {new Date(selectedRun.ts).toLocaleString("mn-MN")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Strategy</p>
                        <p className="truncate">{selectedRun.strategyName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Symbol</p>
                        <p>{selectedRun.symbols.join(", ")}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Хугацаа</p>
                        <p className="text-xs">
                          {selectedRun.range.from} → {selectedRun.range.to}
                        </p>
                      </div>
                    </div>

                    {/* Result */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Үр дүн:</span>
                        {selectedRun.result.ok ? (
                          <Badge variant="outline" className="text-xs border-green-500/50 bg-green-500/10 text-green-500">
                            ✓ OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-red-500/50 bg-red-500/10 text-red-500">
                            ✗ Error
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Entries:</span>
                        <span className={cn(
                          "font-medium",
                          selectedRun.result.entries === 0 && "text-yellow-500"
                        )}>
                          {selectedRun.result.entries ?? "—"}
                        </span>
                      </div>
                      {selectedRun.result.winrate !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Winrate:</span>
                          <span>{selectedRun.result.winrate?.toFixed(1)}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Backend:</span>
                        <Badge variant="secondary" className="text-[10px]">
                          v{selectedRun.backend.simVersion}
                        </Badge>
                      </div>
                    </div>

                    {/* Detectors comparison */}
                    <div className="space-y-2 p-3 rounded-md bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Detector-үүд
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Requested ({selectedRun.detectors.countRequested})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedRun.detectors.requested.slice(0, 8).map(d => {
                              const meta = DETECTOR_BY_ID.get(d)
                              return (
                                <Badge key={d} variant="outline" className="text-[10px]">
                                  {meta?.labelShort || d}
                                </Badge>
                              )
                            })}
                            {selectedRun.detectors.countRequested > 8 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{selectedRun.detectors.countRequested - 8}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Normalized ({selectedRun.detectors.countNormalized})
                            {selectedRun.detectors.countNormalized !== selectedRun.detectors.countRequested && (
                              <span className="text-yellow-500 ml-1">⚠️</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedRun.detectors.normalized.slice(0, 8).map(d => {
                              const meta = DETECTOR_BY_ID.get(d)
                              return (
                                <Badge key={d} variant="outline" className="text-[10px]">
                                  {meta?.labelShort || d}
                                </Badge>
                              )
                            })}
                            {selectedRun.detectors.countNormalized > 8 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{selectedRun.detectors.countNormalized - 8}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Backend classification */}
                      {(selectedRun.backend.implemented.length > 0 || 
                        selectedRun.backend.notImplemented.length > 0 ||
                        selectedRun.backend.unknown.length > 0) && (
                        <div className="pt-2 border-t border-border mt-2 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">
                              ✓ Implemented ({selectedRun.backend.implemented.length})
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-yellow-500">
                              ⚠ Not Impl ({selectedRun.backend.notImplemented.length})
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-red-500">
                              ✗ Unknown ({selectedRun.backend.unknown.length})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Explainability */}
                    {selectedRun.explainability && (
                      <div className="space-y-2 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
                        <p className="text-xs font-medium text-orange-500">
                          Explainability
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Root Cause:</span>{" "}
                          {selectedRun.explainability.rootCause || "—"}
                        </p>
                        {selectedRun.explainability.explanation && (
                          <p className="text-xs text-muted-foreground">
                            {selectedRun.explainability.explanation}
                          </p>
                        )}
                        {selectedRun.explainability.debug?.hitsPerDetector && (
                          <div className="pt-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Hit counts:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(selectedRun.explainability.debug.hitsPerDetector)
                                .slice(0, 10)
                                .map(([det, count]) => (
                                  <Badge 
                                    key={det} 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px]",
                                      (count as number) > 0 
                                        ? "border-green-500/30" 
                                        : "border-muted"
                                    )}
                                  >
                                    {det}: {count as number}
                                  </Badge>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Warnings */}
                    {selectedRun.warnings.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-yellow-500 font-medium">⚠ Warnings</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {selectedRun.warnings.map((w, i) => (
                            <li key={i}>• {formatWarning(w)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Environment info */}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t">
                      <span>Env: {data.environment.vercelEnv}</span>
                      <span>Git: {data.environment.gitCommit}</span>
                      <span>Request: {selectedRun.requestId.slice(0, 8)}...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
