"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Target,
  XCircle,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react"

interface StreamingTrade {
  id: string
  entry_ts: number
  exit_ts?: number
  direction: "BUY" | "SELL"
  entry: number
  sl: number
  tp: number
  outcome?: "TP" | "SL" | "PENDING"
  r?: number
  duration_bars?: number
  detector: string
  symbol?: string
  tf?: string
  // Animation state
  status: "entering" | "waiting" | "resolved"
}

interface LiveTradesStreamProps {
  isRunning: boolean
  trades: StreamingTrade[]
  totalBars?: number
  scannedBars?: number
  currentDate?: string
  className?: string
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(price: number) {
  if (price > 100) return price.toFixed(2)
  if (price > 1) return price.toFixed(4)
  return price.toFixed(5)
}

function TradeCard({ trade, index }: { trade: StreamingTrade; index: number }) {
  const isNew = trade.status === "entering"
  const isPending = trade.status === "waiting" || trade.outcome === "PENDING"
  const isTP = trade.outcome === "TP"
  const isSL = trade.outcome === "SL"

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border transition-all duration-500",
        isNew && "animate-slide-in-right border-primary bg-primary/5",
        isPending && "border-yellow-500/50 bg-yellow-500/5 animate-pulse",
        isTP && "border-green-500/50 bg-green-500/10",
        isSL && "border-red-500/50 bg-red-500/10"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Trade number badge */}
      <div className="absolute -top-2 -left-2">
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 font-mono",
            isTP && "bg-green-500 text-white",
            isSL && "bg-red-500 text-white"
          )}
        >
          #{index + 1}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Left: Direction + Entry */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded",
              trade.direction === "BUY"
                ? "bg-green-500/20 text-green-500"
                : "bg-red-500/20 text-red-500"
            )}
          >
            {trade.direction === "BUY" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium">
              {trade.direction} @ {formatPrice(trade.entry)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(trade.entry_ts)}
            </p>
          </div>
        </div>

        {/* Center: SL/TP levels */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="text-center">
            <p className="text-red-500 font-mono">{formatPrice(trade.sl)}</p>
            <p className="text-[10px] text-muted-foreground">SL</p>
          </div>
          <div className="text-center">
            <p className="text-green-500 font-mono">{formatPrice(trade.tp)}</p>
            <p className="text-[10px] text-muted-foreground">TP</p>
          </div>
        </div>

        {/* Right: Outcome */}
        <div className="flex items-center gap-2">
          {isPending && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">Хүлээж байна...</span>
            </div>
          )}
          {isTP && (
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold">TP HIT!</span>
              {trade.r && (
                <Badge className="bg-green-500 text-white text-[10px]">
                  +{trade.r.toFixed(1)}R
                </Badge>
              )}
            </div>
          )}
          {isSL && (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-bold">SL HIT</span>
              {trade.r && (
                <Badge className="bg-red-500 text-white text-[10px]">
                  {trade.r.toFixed(1)}R
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Duration bar for resolved trades */}
      {trade.duration_bars && trade.outcome && trade.outcome !== "PENDING" && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{trade.duration_bars} bars</span>
          <span>•</span>
          <span>{typeof trade.detector === "string" ? trade.detector : "unknown"}</span>
        </div>
      )}
    </div>
  )
}

export function LiveTradesStream({
  isRunning,
  trades,
  totalBars = 0,
  scannedBars = 0,
  currentDate,
  className,
}: LiveTradesStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progress = totalBars > 0 ? (scannedBars / totalBars) * 100 : 0

  // Auto-scroll to bottom when new trades appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [trades.length])

  const tpCount = trades.filter((t) => t.outcome === "TP").length
  const slCount = trades.filter((t) => t.outcome === "SL").length
  const pendingCount = trades.filter((t) => !t.outcome || t.outcome === "PENDING").length
  const winrate = tpCount + slCount > 0 ? (tpCount / (tpCount + slCount)) * 100 : 0

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap
              className={cn(
                "h-5 w-5",
                isRunning ? "text-yellow-500 animate-pulse" : "text-muted-foreground"
              )}
            />
            <h3 className="font-medium">
              {isRunning ? "Симуляци явагдаж байна..." : "Симуляцийн үр дүн"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              TP: {tpCount}
            </Badge>
            <Badge variant="outline" className="text-red-500 border-red-500/30">
              SL: {slCount}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                Хүлээж: {pendingCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentDate || "Scanning..."}</span>
              <span>{scannedBars.toLocaleString()} / {totalBars.toLocaleString()} bars</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Winrate indicator */}
        {(tpCount + slCount) > 0 && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span>Winrate</span>
                <span
                  className={cn(
                    "font-bold",
                    winrate >= 50 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {winrate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    winrate >= 50 ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${winrate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Trades list */}
        <div
          ref={containerRef}
          className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
        >
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRunning ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm">Entry хайж байна...</p>
                </div>
              ) : (
                <p className="text-sm">Одоогоор trade байхгүй байна</p>
              )}
            </div>
          ) : (
            trades.map((trade, index) => (
              <TradeCard key={trade.id} trade={trade} index={index} />
            ))
          )}
        </div>

        {/* Summary footer */}
        {!isRunning && trades.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="text-lg font-bold">{trades.length}</p>
                <p className="text-muted-foreground">Нийт</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-500">{tpCount}</p>
                <p className="text-muted-foreground">TP</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{slCount}</p>
                <p className="text-muted-foreground">SL</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-bold",
                    winrate >= 50 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {winrate.toFixed(0)}%
                </p>
                <p className="text-muted-foreground">WR</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
