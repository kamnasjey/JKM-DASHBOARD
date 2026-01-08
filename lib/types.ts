export interface User {
  user_id: string
  email: string
  name: string
  telegram_handle?: string
  created_at?: number
}

export interface DashboardMetrics {
  wins: number
  losses: number
  pending: number
  total: number
  winrate: number
  last_scan_time?: number
  next_scan_time?: number
  active_setups?: number
}

export interface SetupMatch {
  signal_id: string
  created_at: number
  user_id: string
  symbol: string
  market: "FX" | "Crypto"
  tf: string
  setup_name: string
  status: "FOUND" | "ACTIVE" | "CLOSED"
  direction?: "BUY" | "SELL"
  entry?: number
  sl?: number
  tp?: number
  rr?: number
  evidence: Record<string, any>
  fail_reasons?: string[]
}

export interface SetupRule {
  id: string
  type: "SMA_CROSS" | "EMA_CROSS" | "RSI" | "BREAKOUT" | "VOLUME_SPIKE"
  params: Record<string, any>
  operator?: "AND" | "OR"
}

export interface Setup {
  id: string
  name: string
  market: "FX" | "Crypto" | "Both"
  symbols: string[]
  timeframe: string
  cadence: number // minutes
  rules: SetupRule[]
  risk_params?: {
    max_risk_pct?: number
    min_rr?: number
  }
  notifications?: {
    telegram?: boolean
    email?: boolean
  }
  status: "Active" | "Paused"
  created_at: number
  updated_at?: number
}

export interface StrategiesResponse {
  schema_version: number
  user_id: string
  strategies: Setup[]
}

export interface BacktestResult {
  setup_id: string
  period: string
  total_matches: number
  wins: number
  losses: number
  winrate: number
  avg_rr: number
}

export interface LogEntry {
  timestamp: number
  level: "INFO" | "WARN" | "ERROR"
  message: string
  details?: any
}
