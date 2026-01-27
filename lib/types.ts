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

// Legacy StrategiesResponse - kept for backward compatibility with Setup[]
export interface LegacyStrategiesResponse {
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
// Metrics types
// ============================================
export interface Metrics {
  total_signals: number
  wins: number
  losses: number
  pending: number
  win_rate: number
  avg_rr?: number
  last_updated?: number
}

// ============================================
// Journey Progress types
// ============================================
export interface JourneyProgress {
  level: "Beginner" | "Intermediate" | "Pro"
  xp: number
  completedMissions: string[]
  badges?: string[]
  streak: number
  lastActiveDate?: string
}

// ============================================
// Risk Settings types
// ============================================
export interface RiskSettings {
  riskPerTrade: number
  maxDailyLoss: number
  maxOpenPositions: number
  preferredRRMin: number
}

// ============================================
// Annotations types
// ============================================
export interface Annotations {
  reasons?: string[]
  [key: string]: unknown
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
  tf?: string // Alias for timeframe
  ts?: string // ISO timestamp (newer payloads)
  created_at: number // epoch seconds
  status: "OK" | "NONE" | "FOUND" | "ACTIVE" | "CLOSED"
  direction: "BUY" | "SELL" | "NA" | "bullish" | "bearish" | "long" | "short"
  entry?: number
  sl?: number
  tp?: number
  rr?: number
  confidence?: number
  strategy_id?: string
  strategy_name?: string
  detectors_normalized?: string[]
  hits_per_detector?: Record<string, number>
  source?: string
  primaryTrigger?: string
  barTs?: string
  simVersion?: string
  explain: Record<string, any>
  evidence: Record<string, any>
  chart_drawings: ChartDrawing[]
  engine_annotations?: Record<string, any>
  fail_reasons?: string[]
  // TP/SL hit tracking fields
  outcome?: "win" | "loss" | "expired" | "pending"
  resolved_at?: number  // epoch seconds
  resolved_price?: number
  // User tracking
  entry_taken?: boolean | null
  user_tracking?: {
    entry_taken?: boolean | null
    notes?: string
    updated_at?: number
  }
}

// ============================================
// Strategy types - matches backend
// ============================================
export interface StrategySpec {
  id?: string // Internal unique ID
  strategy_id: string
  name?: string
  description?: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  allowed_regimes?: string[]
  parameters?: Record<string, any>
  notes?: string
}

// Alias for backward compatibility
export type Strategy = StrategySpec

export interface StrategiesResponse {
  ok?: boolean
  schema_version?: number
  user_id: string
  strategies: StrategySpec[]
  count?: number
}

// Selection validation for strategy maker
export interface SelectionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================
// Detector types
// ============================================
export interface DetectorInfo {
  /** Canonical uppercase ID (e.g., "BOS", "GATE_REGIME") */
  id: string
  /** Legacy name field for backward compatibility */
  name: string
  /** Mongolian (Cyrillic) display label */
  labelMn: string
  /** Mongolian description of what detector does */
  descriptionMn: string
  /** Detector category */
  category: "gate" | "trigger" | "confluence"
  /** Optional documentation */
  doc?: string
  /** Optional parameter schema */
  params_schema?: Record<string, any>
  /** Optional examples */
  examples?: any[]
}

export interface DetectorsResponse {
  ok: boolean
  detectors: DetectorInfo[]
  count: number
  categories?: {
    gate: number
    trigger: number
    confluence: number
  }
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
