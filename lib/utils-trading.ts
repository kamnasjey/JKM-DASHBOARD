// Trading-specific utility functions
import type { SignalPayloadPublicV1 } from "./types"

// Ulaanbaatar timezone (UTC+8)
const UB_TIMEZONE = "Asia/Ulaanbaatar"

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("mn-MN", {
    timeZone: UB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTimestampFull(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("mn-MN", {
    timeZone: UB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("mn-MN", {
    timeZone: UB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("mn-MN", {
    timeZone: UB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatISOToUB(isoString: string): string {
  return new Date(isoString).toLocaleString("mn-MN", {
    timeZone: UB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function calculateConfidence(signal: SignalPayloadPublicV1): number {
  let score = 0
  if (signal.evidence.entry) score += 25
  if (signal.evidence.sl) score += 25
  if (signal.evidence.tp) score += 25
  if (signal.evidence.rr && signal.evidence.rr > 2) score += 25
  return score
}

export function getDirectionColor(direction: string): string {
  if (direction === "BUY") return "text-green-500"
  if (direction === "SELL") return "text-red-500"
  return "text-muted-foreground"
}

export function getDirectionBadgeVariant(direction: string): "default" | "secondary" | "destructive" {
  if (direction === "BUY") return "default"
  if (direction === "SELL") return "destructive"
  return "secondary"
}

export function calculateExposure(riskPerTrade: number, openPositions: number): number {
  return riskPerTrade * openPositions
}
