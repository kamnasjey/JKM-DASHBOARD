// Core types for JKM Trading AI

export interface User {
  user_id: string
  email: string
  name: string
  telegram_handle?: string
  strategy_note?: string
  is_admin?: boolean
  created_at?: number
}

export interface Metrics {
  user_id: string
  wins: number
  losses: number
  pending: number
  expired: number
  total: number
  decided: number
  winrate: number
}

export interface SignalPayloadPublicV1 {
  signal_id: string
  created_at: number
  user_id: string
  symbol: string
  tf: string
  status: "OK" | "NONE"
  direction: "BUY" | "SELL" | "NA"
  entry: number | null
  sl: number | null
  tp: number | null
  rr: number | null
  explain: Record<string, any>
  evidence: Record<string, any>
  chart_drawings: ChartDrawing[]
}

export interface ChartDrawing {
  object_id: string
  kind: "line" | "box" | "label"
  type: string
  label?: string
  price?: number
  price_from?: number
  price_to?: number
}

export interface Annotations {
  symbol: string
  has_setup: boolean
  levels: any[]
  zones: any[]
  fiboZones: any[]
  reasons: string[]
}

export interface Strategy {
  name: string
  description?: string
  enabled?: boolean
  parameters?: Record<string, any>
}

export interface StrategiesResponse {
  schema_version: number
  user_id: string
  strategies: Strategy[]
}

export interface Profile {
  user_id: string
  name: string
  email: string
  telegram_handle?: string
  strategy_note?: string
  preferences?: Record<string, any>
}

// Client-side types
export interface RiskSettings {
  riskPerTrade: number // percentage
  maxDailyLoss: number // percentage
  maxOpenPositions: number
  preferredRRMin: number
}

export interface JourneyProgress {
  level: "Beginner" | "Intermediate" | "Pro"
  xp: number
  completedMissions: string[]
  badges: string[]
  streak: number
}
