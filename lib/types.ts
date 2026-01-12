export interface User {
  user_id: string
  email: string
  name: string
  telegram_handle?: string
  created_at?: number
}

// Backend profile payload shape used by /api/profile endpoints
export interface Profile {
  name?: string | null
  email?: string | null
  telegram_handle?: string | null
  strategy_note?: string | null
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

// ============================================
// Signal Payload (Public V1) - matches backend
// ============================================
export interface ChartDrawing {
  object_id: string
  kind: "line" | "box" | "label"
  type?: string
  label?: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  price?: number
  price_from?: number
  price_to?: number
  text?: string
  time?: number
  time_from?: number
  time_to?: number
}

export interface SignalPayloadPublicV1 {
  signal_id: string
  user_id?: string
  symbol: string
  timeframe: string
  created_at: number // epoch seconds
  status: "OK" | "NONE" | "FOUND" | "ACTIVE" | "CLOSED"
  direction: "BUY" | "SELL" | "NA"
  entry?: number
  sl?: number
  tp?: number
  rr?: number
  explain: Record<string, any>
  evidence: Record<string, any>
  chart_drawings: ChartDrawing[]
  engine_annotations?: Record<string, any>
  fail_reasons?: string[]
}

// ============================================
// Strategy types - matches backend
// ============================================
export interface StrategySpec {
  strategy_id: string
  name?: string
  description?: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  allowed_regimes?: string[]
  parameters?: Record<string, any>
}

export interface StrategiesResponse {
  ok?: boolean
  schema_version?: number
  user_id: string
  strategies: StrategySpec[]
  count?: number
}

// ============================================
// Detector types
// ============================================
export interface DetectorInfo {
  name: string
  doc?: string
  params_schema?: Record<string, any>
  examples?: any[]
}

export interface DetectorsResponse {
  ok: boolean
  detectors: DetectorInfo[]
  count: number
}

// ============================================
// Candle types
// ============================================
export interface Candle {
  time: number // epoch seconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface CandlesResponse {
  ok: boolean
  symbol: string
  tf: string
  candles: Candle[]
  count: number
}
