"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Clock,
  Target,
  ShieldAlert,
  History,
} from "lucide-react"
import type { SignalPayloadPublicV1 } from "@/lib/types"

interface SignalWithEntry {
  signal_id?: string
  symbol: string
  direction: string
  entry: number | string
  tp?: number | string
  sl?: number | string
  rr?: number
  created_at?: string | number
  timestamp?: string | number
  generated_at?: string // Signal generation timestamp
  ts?: string // Alias for generated_at
  // Entry tracking
  entry_taken?: boolean | null
  outcome?: "win" | "loss" | "pending" | null
}

interface SignalsHistoryPanelProps {
  signals: SignalWithEntry[]
  onEntryToggle?: (signalId: string, taken: boolean) => void
  onOutcomeSet?: (signalId: string, outcome: "win" | "loss" | null) => void
  showWinRate?: boolean
}

export function SignalsHistoryPanel({
  signals,
  onEntryToggle,
  onOutcomeSet,
  showWinRate = true,
}: SignalsHistoryPanelProps) {
  const stats = useMemo(() => {
    const taken = signals.filter((s) => s.entry_taken === true)
    const wins = taken.filter((s) => s.outcome === "win").length
    const losses = taken.filter((s) => s.outcome === "loss").length
    const total = wins + losses
    const winRate = total > 0 ? (wins / total) * 100 : 0
    return { taken: taken.length, wins, losses, total, winRate }
  }, [signals])

  const formatTime = (ts: string | number | undefined) => {
    if (!ts) return "—"
    try {
      let timestamp: number
      if (typeof ts === "string") {
        // Check if it's a numeric string (Unix timestamp) or ISO string
        const parsed = parseInt(ts, 10)
        if (!isNaN(parsed) && ts.match(/^\d+$/)) {
          // Unix timestamp as string - need to convert to milliseconds
          timestamp = parsed < 4102444800 ? parsed * 1000 : parsed
        } else {
          // ISO date string
          timestamp = new Date(ts).getTime()
        }
      } else {
        // Number - check if seconds or milliseconds
        timestamp = ts < 4102444800 ? ts * 1000 : ts
      }

      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return "—"

      return date.toLocaleString("mn-MN", {
        timeZone: "Asia/Ulaanbaatar",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "—"
    }
  }

  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return "—"
    const num = typeof price === "string" ? parseFloat(price) : price
    if (!Number.isFinite(num)) return "—"
    // For forex pairs, show 5 decimals; for others (gold, crypto) show 2
    return num > 100 ? num.toFixed(2) : num.toFixed(5)
  }

  if (signals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Setups History
          </CardTitle>
          <CardDescription>Олдсон setup-үүд энд харагдана</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">Scanner 5 минут тутам шалгаж байна</p>
            <p className="text-xs text-muted-foreground">Удахгүй setup олдож болно. Стратеги идэвхтэй эсэхийг шалгана уу.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Setups History ({signals.length})
            </CardTitle>
            <CardDescription>Олдсон setup-үүд • Entry орсон/алгассан</CardDescription>
          </div>

          {showWinRate && stats.total > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Win Rate ({stats.wins}W / {stats.losses}L)
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Symbol</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">TP</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead>Цаг</TableHead>
                <TableHead className="text-center">Entry</TableHead>
                <TableHead className="text-center">Үр дүн</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signals.map((signal, idx) => {
                const signalId = signal.signal_id || `signal-${idx}`
                const isBuy = signal.direction === "BUY"
                const entryTaken = signal.entry_taken

                return (
                  <TableRow key={signalId}>
                    <TableCell className="font-mono font-medium">
                      {signal.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isBuy ? "default" : "destructive"}
                        className={`${
                          isBuy ? "bg-green-600" : "bg-red-600"
                        } text-white text-xs`}
                      >
                        {isBuy ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {signal.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(signal.entry)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      <span className="flex items-center justify-end gap-1">
                        <Target className="h-3 w-3" />
                        {formatPrice(signal.tp)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      <span className="flex items-center justify-end gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        {formatPrice(signal.sl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(signal.generated_at || signal.ts || signal.timestamp || signal.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={
                          entryTaken === true
                            ? "default"
                            : entryTaken === false
                            ? "outline"
                            : "ghost"
                        }
                        size="sm"
                        className={`h-7 w-7 p-0 ${
                          entryTaken === true
                            ? "bg-green-600 hover:bg-green-700"
                            : entryTaken === false
                            ? "border-red-500 text-red-500"
                            : ""
                        }`}
                        onClick={() => {
                          const newValue = entryTaken !== true
                          onEntryToggle?.(signalId, newValue)
                        }}
                        title={
                          entryTaken === true
                            ? "Entry орсон (дарж болихгүй болгох)"
                            : "Entry ороогүй (дарж орсон болгох)"
                        }
                      >
                        {entryTaken === true ? (
                          <Check className="h-4 w-4" />
                        ) : entryTaken === false ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      {onOutcomeSet ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant={signal.outcome === "win" ? "default" : "ghost"}
                            size="sm"
                            className={`h-6 px-2 text-xs ${
                              signal.outcome === "win"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "text-green-600 hover:bg-green-100"
                            }`}
                            onClick={() => onOutcomeSet(signalId, signal.outcome === "win" ? null : "win")}
                            title="TP цохисон"
                          >
                            TP
                          </Button>
                          <Button
                            variant={signal.outcome === "loss" ? "default" : "ghost"}
                            size="sm"
                            className={`h-6 px-2 text-xs ${
                              signal.outcome === "loss"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "text-red-600 hover:bg-red-100"
                            }`}
                            onClick={() => onOutcomeSet(signalId, signal.outcome === "loss" ? null : "loss")}
                            title="SL цохисон"
                          >
                            SL
                          </Button>
                        </div>
                      ) : (
                        <>
                          {signal.outcome === "win" && (
                            <Badge className="bg-green-600 text-white">WIN</Badge>
                          )}
                          {signal.outcome === "loss" && (
                            <Badge className="bg-red-600 text-white">LOSS</Badge>
                          )}
                          {signal.outcome === "pending" && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                          {!signal.outcome && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
