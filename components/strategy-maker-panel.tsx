"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Bot,
  Check,
  Save,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

type DetectorRole = "gate" | "trigger" | "confluence"

interface Message {
  role: "user" | "assistant"
  content: string
  detectors?: string[]
}

// NEW: 3-Layer Detector Types
type DetectorLayer = "context" | "trigger" | "risk"

interface Detector {
  name: string
  role: DetectorRole
  layer: DetectorLayer  // NEW: 3-layer classification
  description: string
  required?: boolean
  options?: DetectorOption[]  // NEW: Configurable options
}

interface DetectorOption {
  key: string
  label: string
  type: "select" | "number"
  values?: string[]
  default?: string | number
}

const MAX_STRATEGIES = 30

// NEW: 3-Layer Detector System (Context / Trigger / Risk)
const ALL_DETECTORS: Detector[] = [
  // ============================================================
  // LAYER 1: CONTEXT (Хаана ажиллах вэ?)
  // ============================================================
  { 
    name: "session_filter", 
    role: "gate", 
    layer: "context",
    description: "Trading session шүүлт (London/NY/Overlap)", 
    options: [
      { key: "sessions", label: "Sessions", type: "select", values: ["London", "NY", "Overlap", "Asia", "ALL"], default: "ALL" }
    ]
  },
  { 
    name: "htf_bias", 
    role: "gate", 
    layer: "context",
    description: "Higher Timeframe чиглэл шүүлт",
    options: [
      { key: "bias", label: "Bias", type: "select", values: ["BULLISH", "BEARISH", "ANY"], default: "ANY" }
    ]
  },
  { 
    name: "volatility_filter", 
    role: "gate", 
    layer: "context",
    description: "Volatility төлөв шүүлт",
    options: [
      { key: "mode", label: "Mode", type: "select", values: ["HIGH", "NORMAL", "LOW", "ANY"], default: "ANY" }
    ]
  },
  { name: "gate_regime", role: "gate", layer: "context", description: "Зах зээл Trend/Range/Chop байгааг тодорхойлно", required: true },
  { name: "gate_volatility", role: "gate", layer: "context", description: "Volatility өндөр/бага/хэвийн гэдгийг хэмжинэ" },
  
  // ============================================================
  // LAYER 2: TRIGGER (Хаана орох вэ?)
  // ============================================================
  // Core ICT/SMC Triggers
  { name: "bos", role: "trigger", layer: "trigger", description: "Break of Structure - Бүтэц эвдэх" },
  { name: "choch", role: "trigger", layer: "trigger", description: "Change of Character - Чиглэл өөрчлөх" },
  { name: "fvg", role: "trigger", layer: "trigger", description: "Fair Value Gap - Үнийн цоорхой" },
  { name: "ob", role: "trigger", layer: "trigger", description: "Order Block - Захиалгын бүс" },
  { name: "sweep", role: "trigger", layer: "trigger", description: "Liquidity Sweep - Хөрвөх чадварын цуглуулга" },
  // Additional Triggers
  { name: "break_retest", role: "trigger", layer: "trigger", description: "S/R эвдээд буцаад retest хийх" },
  { name: "compression_expansion", role: "trigger", layer: "trigger", description: "Volatility шахагдаад дэлбэрэх (squeeze → expansion)" },
  { name: "momentum_continuation", role: "trigger", layer: "trigger", description: "Impulse → pullback → continuation" },
  { name: "mean_reversion_snapback", role: "trigger", layer: "trigger", description: "Дундаж руу буцах (snapback)" },
  { name: "sr_bounce", role: "trigger", layer: "trigger", description: "S/R түвшингээс эргэлт" },
  { name: "sr_break_close", role: "trigger", layer: "trigger", description: "S/R түвшин дээр clean close гарсан" },
  
  // ============================================================
  // LAYER 3: CONFLUENCE / CONFIRMATION
  // ============================================================
  { name: "engulf_at_level", role: "confluence", layer: "trigger", description: "Чухал түвшин дээр гарсан engulfing" },
  { name: "pinbar_at_level", role: "confluence", layer: "trigger", description: "Чухал түвшин дээр гарсан pinbar" },
  { name: "doji", role: "confluence", layer: "trigger", description: "Шийдэмгий бус лаа (нээлт≈хаалт)" },
  { name: "double_top_bottom", role: "confluence", layer: "trigger", description: "Double top / bottom pattern" },
  { name: "fakeout_trap", role: "confluence", layer: "trigger", description: "Fakeout trap (wick out → close back inside)" },
  { name: "fibo_retrace_confluence", role: "confluence", layer: "trigger", description: "Fibo retrace + S/R confluence" },
  { name: "flag_pennant", role: "confluence", layer: "trigger", description: "Flag / pennant pattern" },
  { name: "sr_role_reversal", role: "confluence", layer: "trigger", description: "Resistance → Support (эсвэл эсрэгээр)" },
]

// Layer labels and colors
const LAYER_LABELS: Record<DetectorLayer, string> = {
  context: "📍 CONTEXT (Хаана ажиллах?)",
  trigger: "🎯 TRIGGER (Хаана орох?)",
  risk: "🛡️ RISK (Яаж дуусгах?)",
}

const LAYER_COLORS: Record<DetectorLayer, string> = {
  context: "bg-purple-500/15 border-purple-500/40 text-purple-200",
  trigger: "bg-blue-500/15 border-blue-500/40 text-blue-200",
  risk: "bg-green-500/15 border-green-500/40 text-green-200",
}

const ROLE_LABELS: Record<DetectorRole, string> = {
  gate: "Context / Gate",
  trigger: "Trigger (Entry)",
  confluence: "Confluence (Баталгаа)",
}

const ROLE_COLORS: Record<DetectorRole, string> = {
  gate: "bg-purple-500/15 border-purple-500/40 text-purple-200",
  trigger: "bg-blue-500/15 border-blue-500/40 text-blue-200",
  confluence: "bg-green-500/15 border-green-500/40 text-green-200",
}

// Preset Strategy Templates - Based on 7-day backtest (Jan 2026)
// All presets: 60%+ WR, 4+ entries, RR 2.5+
const STRATEGY_PRESETS = [
  // =====================================================
  // TOP PERFORMERS (70%+ WR)
  // =====================================================
  {
    id: "btcusd_bos_pinbar",
    name: "🏆 BTCUSD BOS+PINBAR (83.3% WR)",
    description: "7 хоногийн тестэд 83.3% WR (5W/1L), 6 trades, RR 2.5. BTCUSD 15m дээр BOS trigger + PINBAR confluence.",
    detectors: ["bos", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "BTCUSD", recommended_tf: "15m" }
  },
  {
    id: "btcusd_choch_pinbar",
    name: "💎 BTCUSD CHOCH+PINBAR (80% WR)",
    description: "7 хоногийн тестэд 80% WR (4W/1L), 5 trades, RR 2.5-3.0. BTCUSD 15m дээр CHOCH trigger + PINBAR confluence.",
    detectors: ["choch", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "BTCUSD", recommended_tf: "15m" }
  },
  {
    id: "btcusd_triple_combo",
    name: "🎯 BTCUSD BOS+CHOCH+PINBAR (77.8% WR)",
    description: "7 хоногийн тестэд 77.8% WR (7W/2L), 9 trades, RR 2.5. Хамгийн олон trade-тай combo.",
    detectors: ["bos", "choch", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "BTCUSD", recommended_tf: "15m" }
  },
  {
    id: "btcusdt_ob",
    name: "💰 BTCUSDT OB (75% WR)",
    description: "7 хоногийн тестэд 75% WR (3W/1L), 4 trades, RR 2.5. BTCUSDT 15m дээр Order Block trigger.",
    detectors: ["ob"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "BTCUSDT", recommended_tf: "15m" }
  },
  
  // =====================================================
  // SOLID PERFORMERS (60-70% WR)
  // =====================================================
  {
    id: "usdchf_ob_doji",
    name: "🔥 USDCHF OB+DOJI (66.7% WR)",
    description: "7 хоногийн тестэд 66.7% WR (4W/2L), 6 trades, RR 2.5. USDCHF 15m дээр OB trigger + DOJI confluence.",
    detectors: ["ob", "doji"],
    config: { htf_bias: "ANY", session_filter: "London,NY", rr: 2.5, recommended_symbol: "USDCHF", recommended_tf: "15m" }
  },
  {
    id: "usdchf_ob_pinbar",
    name: "📊 USDCHF OB+PINBAR (64.3% WR)",
    description: "7 хоногийн тестэд 64.3% WR (9W/5L), 14 trades, RR 2.5. Хамгийн олон trade: USDCHF 15m OB+PINBAR.",
    detectors: ["ob", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "London,NY", rr: 2.5, recommended_symbol: "USDCHF", recommended_tf: "15m" }
  },
  {
    id: "xauusd_sr_bounce_pinbar",
    name: "🥇 XAUUSD SR_BOUNCE+PINBAR (62.5% WR)",
    description: "7 хоногийн тестэд 62.5% WR (5W/3L), 8 trades, RR 2.5. XAUUSD 15m дээр S/R bounce + PINBAR.",
    detectors: ["sr_bounce", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "London,NY", rr: 2.5, recommended_symbol: "XAUUSD", recommended_tf: "15m" }
  },
  {
    id: "audusd_break_retest",
    name: "📈 AUDUSD BREAK_RETEST (61.5% WR)",
    description: "7 хоногийн тестэд 61.5% WR (8W/5L), 13 trades, RR 2.5. Хамгийн идэвхтэй: AUDUSD 15m Break & Retest.",
    detectors: ["break_retest"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "AUDUSD", recommended_tf: "15m" }
  },
  
  // =====================================================
  // OTHER PAIRS (60% WR)
  // =====================================================
  {
    id: "usdjpy_sweep_dbl_top",
    name: "🌊 USDJPY SWEEP+DBL_TOP (60% WR)",
    description: "7 хоногийн тестэд 60% WR (3W/2L), 5 trades, RR 2.5. USDJPY 15m дээр Liquidity Sweep + Double Top/Bottom.",
    detectors: ["sweep", "double_top_bottom"],
    config: { htf_bias: "ANY", session_filter: "London,NY", rr: 2.5, recommended_symbol: "USDJPY", recommended_tf: "15m" }
  },
  {
    id: "nzdusd_bos_pinbar",
    name: "🌿 NZDUSD BOS+PINBAR (60% WR)",
    description: "7 хоногийн тестэд 60% WR (3W/2L), 5 trades, RR 2.5. NZDUSD 15m дээр BOS trigger + PINBAR confluence.",
    detectors: ["bos", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5, recommended_symbol: "NZDUSD", recommended_tf: "15m" }
  },
  
  // =====================================================
  // UNIVERSAL (All Pairs)
  // =====================================================
  {
    id: "universal_bos_pinbar",
    name: "🌐 Universal BOS+PINBAR",
    description: "BOS+PINBAR combo нь олон pair дээр тогтвортой ажилладаг (BTCUSD 83%, NZDUSD 60%). Бүх pair дээр ашиглах боломжтой.",
    detectors: ["bos", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5 }
  },
  {
    id: "universal_ob_pinbar",
    name: "🌐 Universal OB+PINBAR",
    description: "OB+PINBAR combo (USDCHF 64.3%, BTCUSDT 75%). Order Block + Pinbar бол найдвартай combo.",
    detectors: ["ob", "pinbar_at_level"],
    config: { htf_bias: "ANY", session_filter: "ALL", rr: 2.5 }
  }
]

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    `Сайн байна уу! Би таны Strategy Maker туслах байна.\n\n` +
    `🎯 **3-Давхар Strategy Builder**:\n` +
    `1. 📍 **Context** - Хаана ажиллах? (Session, HTF Bias, Volatility)\n` +
    `2. 🎯 **Trigger** - Хаана орох? (BOS, FVG, OB, CHOCH, SWEEP)\n` +
    `3. 🛡️ **Risk** - Яаж дуусгах? (RR, Time Exit)\n\n` +
    `💡 **Хурдан эхлэх**: Preset template сонгоод өөрчилж болно!\n\n` +
    `Надад дараах зүйлсийг хэлээрэй:\n` +
    `- Та ямар төрлийн trader бэ? (Trend follower, Range trader, Scalper...)\n` +
    `- Ямар timeframe дээр trade хийдэг вэ? (5m, 15m, 1H, 4H...)\n\n` +
    `Жишээ: "Би trend follower, 4H timeframe дээр BTC trade хийдэг"`,
}

export function StrategyMakerPanel(props: {
  embedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}) {
  const { toast } = useToast()

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDetectors, setSelectedDetectors] = useState<string[]>(["gate_regime"])
  const [strategyName, setStrategyName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // NEW: Risk/Exit settings
  const [riskSettings, setRiskSettings] = useState({
    rr: 3.0,
    timeExitBars: 12,
    cooldownBars: 3,
  })
  
  // NEW: Context filter settings  
  const [contextSettings, setContextSettings] = useState({
    sessionFilter: "ALL",
    htfBias: "ANY",
    volatilityFilter: "ANY",
  })

  // NEW: Apply preset
  const applyPreset = (preset: typeof STRATEGY_PRESETS[0]) => {
    setSelectedDetectors(preset.detectors)
    setStrategyName(preset.name.replace(/[🔥💎📊]/g, "").trim())
    if (preset.config) {
      setRiskSettings(prev => ({ ...prev, rr: preset.config.rr || 2.0 }))
      setContextSettings(prev => ({
        ...prev,
        htfBias: preset.config.htf_bias || "ANY",
        sessionFilter: preset.config.session_filter || "ALL",
      }))
    }
    toast({ title: "Preset Applied", description: `${preset.name} template ашиглав` })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/strategy-maker/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          current_detectors: selectedDetectors,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        detectors: data.recommended_detectors,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.recommended_detectors?.length > 0) {
        setSelectedDetectors(data.recommended_detectors)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDetector = (name: string) => {
    const detector = ALL_DETECTORS.find((d) => d.name === name)
    if (detector?.required && selectedDetectors.includes(name)) return

    if (selectedDetectors.includes(name)) {
      setSelectedDetectors(selectedDetectors.filter((d) => d !== name))
    } else {
      setSelectedDetectors([...selectedDetectors, name])
    }
  }

  // Group detectors by layer (NEW 3-layer structure)
  const groupedByLayer = ALL_DETECTORS.reduce((acc, det) => {
    if (!acc[det.layer]) acc[det.layer] = []
    acc[det.layer].push(det)
    return acc
  }, {} as Record<DetectorLayer, Detector[]>)

  const validation = {
    context: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.layer === "context").length,
    triggers: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.layer === "trigger" && ALL_DETECTORS.find((det) => det.name === d)?.role === "trigger").length,
    confluences: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "confluence").length,
  }

  // Simplified validation: need at least 1 context + 1 trigger
  const isValid = validation.context >= 1 && validation.triggers >= 1

  const makeStrategyId = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") +
    "_" +
    Date.now().toString(36)

  const saveStrategy = async () => {
    const name = strategyName.trim()

    if (!name) {
      toast({ 
        title: "Missing Name", 
        description: "Please enter a strategy name / Strategy нэр оруулна уу", 
        variant: "destructive" 
      })
      return
    }

    if (!isValid) {
      // Build detailed validation message
      const missing: string[] = []
      if (validation.context < 1) missing.push("Context (1+)")
      if (validation.triggers < 1) missing.push("Trigger (1+)")
      
      toast({
        title: "Incomplete Selection",
        description: `Please select at least: ${missing.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Use v2 API (Firestore-based) - single source of truth
      // NEW: Include context and risk settings
      const result = await api.strategiesV2.create({
        name,
        enabled: true,
        detectors: selectedDetectors,
        config: {
          min_score: 1.0,
          min_rr: riskSettings.rr,
          gate_regime_enabled: selectedDetectors.includes("gate_regime"),
          // NEW: Context filter settings
          context_filters: {
            session_filter: contextSettings.sessionFilter,
            htf_bias: contextSettings.htfBias,
            volatility_filter: contextSettings.volatilityFilter,
          },
          // NEW: Risk/Exit settings
          risk_settings: {
            rr: riskSettings.rr,
            time_exit_bars: riskSettings.timeExitBars,
            cooldown_bars: riskSettings.cooldownBars,
          },
        },
      })

      if (!result.ok) {
        // Handle specific error codes with detailed messages
        const errorData = result as any
        const errorCode = errorData.error || errorData.code || "UNKNOWN"
        const errorMessage = errorData.message || errorData.error || "Unknown error"
        
        if (errorCode === "LIMIT_REACHED" || errorCode === "LIMIT_EXCEEDED" || errorMessage.includes("Maximum")) {
          toast({
            title: "Strategy Limit Reached",
            description: `Maximum ${MAX_STRATEGIES} strategies allowed. Delete an existing strategy to create a new one.`,
            variant: "destructive",
          })
          return
        }
        
        // Show the actual server error message
        toast({
          title: `Error: ${errorCode}`,
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      toast({ title: "Success!", description: "Strategy saved successfully" })
      setStrategyName("")
      props.onSaved?.()
    } catch (err: any) {
      // Try to extract detailed error from response
      let errorMessage = "Failed to save strategy"
      let errorCode = "SAVE_ERROR"
      
      if (err?.response) {
        try {
          const data = await err.response.json?.() || err.response
          errorCode = data.error || data.code || errorCode
          errorMessage = data.message || data.error || errorMessage
        } catch {
          errorMessage = err.message || errorMessage
        }
      } else {
        errorMessage = err?.message || errorMessage
      }
      
      // Check for limit error in exception message
      if (errorMessage.includes("Maximum") || errorMessage.includes("LIMIT")) {
        toast({
          title: "Strategy Limit Reached",
          description: `Maximum ${MAX_STRATEGIES} strategies allowed.`,
          variant: "destructive",
        })
        return
      }
      
      // Show detailed error
      toast({
        title: `Error: ${errorCode}`,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={props.embedded ? "space-y-6" : "space-y-6"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Strategy Maker</h2>
            <p className="text-sm text-muted-foreground">AI + detector selection</p>
          </div>
        </div>
        {props.onCancel && (
          <Button variant="outline" onClick={props.onCancel}>
            Стратегиуд руу
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Chat */}
        <div className="rounded-2xl border bg-card flex flex-col h-[calc(100vh-260px)] min-h-[520px]">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              <span className="font-medium">AI Strategy Assistant</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-blue-500" : "bg-purple-500"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user" ? "bg-blue-500 text-white" : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                  {msg.detectors && msg.detectors.length > 0 && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="text-xs text-green-500 mb-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Санал болгож буй детекторууд:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.detectors.map((d) => (
                          <span key={d} className="px-2 py-1 bg-green-500/20 rounded text-xs font-mono">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Өөрийн trading арга барилаа бичээрэй..."
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: 3-Layer Strategy Builder */}
        <div className="space-y-4">
          {/* Preset Templates (NEW!) */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              💡 Preset Templates (Хурдан эхлэх)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {STRATEGY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-3 rounded-lg border border-border bg-background hover:border-purple-500/50 hover:bg-purple-500/5 text-left transition-all"
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Validation Status */}
          <div
            className={`p-4 rounded-xl border ${
              isValid ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {isValid ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span className={isValid ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                  {isValid ? "Strategy бэлэн!" : "Дутуу детектор байна"}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className={validation.context >= 1 ? "text-green-500" : "text-red-500"}>Context: {validation.context}/1+</span>
                <span className={validation.triggers >= 1 ? "text-green-500" : "text-red-500"}>Trigger: {validation.triggers}/1+</span>
              </div>
            </div>
          </div>

          {/* 3-Layer Detector Selection */}
          <div className="rounded-2xl border bg-card p-4 max-h-[calc(100vh-600px)] overflow-y-auto">
            {(["context", "trigger"] as DetectorLayer[]).map((layer) => (
              <div key={layer} className="mb-6 last:mb-0">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  {LAYER_LABELS[layer]}
                  <span className="text-muted-foreground">
                    ({selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.layer === layer).length} сонгосон)
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {groupedByLayer[layer]?.map((det) => {
                    const isSelected = selectedDetectors.includes(det.name)
                    return (
                      <button
                        key={det.name}
                        onClick={() => toggleDetector(det.name)}
                        disabled={det.required && isSelected}
                        className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? LAYER_COLORS[layer]
                            : "border-border bg-background hover:border-foreground/30 text-foreground"
                        } ${det.required ? "ring-1 ring-yellow-500/30" : ""}`}
                      >
                        <div>
                          <div className="font-mono text-sm">{det.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{det.description}</div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Risk/Exit Settings (NEW!) */}
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              🛡️ RISK / EXIT Settings
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Risk:Reward</label>
                <Input 
                  type="number" 
                  step="0.5" 
                  min="1" 
                  max="5"
                  value={riskSettings.rr} 
                  onChange={(e) => setRiskSettings(prev => ({ ...prev, rr: parseFloat(e.target.value) || 2.0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Time Exit (bars)</label>
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={riskSettings.timeExitBars} 
                  onChange={(e) => setRiskSettings(prev => ({ ...prev, timeExitBars: parseInt(e.target.value) || 12 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cooldown (bars)</label>
                <Input 
                  type="number" 
                  min="0" 
                  max="20"
                  value={riskSettings.cooldownBars} 
                  onChange={(e) => setRiskSettings(prev => ({ ...prev, cooldownBars: parseInt(e.target.value) || 3 }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Save Strategy */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex gap-3 flex-wrap">
              <Input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} placeholder="Strategy name..." />
              <Button onClick={saveStrategy} disabled={!isValid || !strategyName.trim() || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Strategy"}
              </Button>
            </div>
            {/* Validation warning when button is disabled */}
            {!isValid && (
              <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Select at least 1 Context filter and 1 Trigger to save.
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Selected: {selectedDetectors.length} detectors • RR: {riskSettings.rr} • TimeExit: {riskSettings.timeExitBars} bars
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
