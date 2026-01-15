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

interface Detector {
  name: string
  role: DetectorRole
  description: string
  required?: boolean
}

const MAX_STRATEGIES = 30

// 24 detectors (synced with backend /api/detectors)
const ALL_DETECTORS: Detector[] = [
  // Gates
  { name: "gate_regime", role: "gate", description: "Зах зээл Trend/Range/Chop байгааг тодорхойлно", required: true },
  { name: "gate_volatility", role: "gate", description: "Volatility өндөр/бага/хэвийн гэдгийг хэмжинэ" },
  { name: "gate_drift_sentinel", role: "gate", description: "Сканнерийн гүйцэтгэл муудаж байгааг анхааруулна" },

  // Triggers (entry)
  { name: "break_retest", role: "trigger", description: "S/R эвдээд буцаад retest хийх" },
  { name: "breakout_retest_entry", role: "trigger", description: "Breakout → retest → confirmation (илүү strict)" },
  { name: "compression_expansion", role: "trigger", description: "Volatility шахагдаад дэлбэрэх (squeeze → expansion)" },
  { name: "momentum_continuation", role: "trigger", description: "Impulse → pullback → continuation" },
  { name: "mean_reversion_snapback", role: "trigger", description: "Дундаж руу буцах (snapback)" },
  { name: "sr_bounce", role: "trigger", description: "S/R түвшингээс эргэлт" },
  { name: "sr_break_close", role: "trigger", description: "S/R түвшин дээр clean close гарсан" },
  { name: "triangle_breakout_close", role: "trigger", description: "Triangle breakout close" },

  // Confluence (confirmation)
  { name: "doji", role: "confluence", description: "Шийдэмгий бус лаа (нээлт≈хаалт)" },
  { name: "double_top_bottom", role: "confluence", description: "Double top / bottom pattern" },
  { name: "engulf_at_level", role: "confluence", description: "Чухал түвшин дээр гарсан engulfing" },
  { name: "fakeout_trap", role: "confluence", description: "Fakeout trap (wick out → close back inside)" },
  { name: "fibo_extension", role: "confluence", description: "Fibo extension зорилтот түвшин" },
  { name: "fibo_retrace_confluence", role: "confluence", description: "Fibo retrace + S/R confluence" },
  { name: "flag_pennant", role: "confluence", description: "Flag / pennant pattern" },
  { name: "head_shoulders", role: "confluence", description: "Head & Shoulders pattern" },
  { name: "pinbar_at_level", role: "confluence", description: "Чухал түвшин дээр гарсан pinbar" },
  { name: "price_momentum_weakening", role: "confluence", description: "Momentum weakening (сулрах)" },
  { name: "rectangle_range_edge", role: "confluence", description: "Range edge (rectangle) дээр fade хийх" },
  { name: "sr_role_reversal", role: "confluence", description: "Resistance → Support (эсвэл эсрэгээр)" },
  { name: "trend_fibo", role: "confluence", description: "Trend + fib retracement zone confluence" },
]

const ROLE_LABELS: Record<DetectorRole, string> = {
  gate: "Gate (Шүүлт)",
  trigger: "Trigger (Entry)",
  confluence: "Confluence (Баталгаа)",
}

const ROLE_COLORS: Record<DetectorRole, string> = {
  gate: "bg-yellow-500/15 border-yellow-500/40 text-yellow-200",
  trigger: "bg-blue-500/15 border-blue-500/40 text-blue-200",
  confluence: "bg-green-500/15 border-green-500/40 text-green-200",
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    `Сайн байна уу! Би таны Strategy Maker туслах байна.\n\n` +
    `Надад дараах зүйлсийг хэлээрэй:\n` +
    `- Та ямар төрлийн trader бэ? (Trend follower, Range trader, Scalper, Swing trader...)\n` +
    `- Таны risk tolerance ямар вэ? (Аюулгүй, Дунд, Өндөр эрсдэл)\n` +
    `- Ямар timeframe дээр trade хийдэг вэ? (1m, 5m, 15m, 1H, 4H, Daily...)\n` +
    `- Ямар зах зээл дээр trade хийдэг вэ? (Forex, Crypto, Indices, Commodities...)\n\n` +
    `Жишээ: "Би trend follower, 4H timeframe дээр BTCUSD trade хийдэг, дунд зэргийн эрсдэл авдаг"`,
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

  const groupedDetectors = ALL_DETECTORS.reduce((acc, det) => {
    if (!acc[det.role]) acc[det.role] = []
    acc[det.role].push(det)
    return acc
  }, {} as Record<DetectorRole, Detector[]>)

  const validation = {
    gates: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "gate").length,
    triggers: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "trigger").length,
    confluences: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "confluence").length,
  }

  const isValid = validation.gates >= 1 && validation.triggers >= 1 && validation.confluences >= 1

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
      toast({ title: "Алдаа", description: "Strategy нэр оруулна уу", variant: "destructive" })
      return
    }

    if (!isValid) {
      toast({
        title: "Анхааруулга",
        description: "Gate/Trigger/Confluence тус бүрээс хамгийн багадаа 1-ийг сонгоно уу",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const current = await api.strategies().catch(() => ({ strategies: [] }))
      const existing = Array.isArray((current as any)?.strategies) ? ((current as any).strategies as any[]) : []

      if (existing.length >= MAX_STRATEGIES) {
        toast({
          title: "Хязгаарлалт",
          description: `Хамгийн ихдээ ${MAX_STRATEGIES} стратеги үүсгэх боломжтой.`,
          variant: "destructive",
        })
        return
      }

      const nameLower = name.toLowerCase()
      const existingIndex = existing.findIndex((s) => String(s?.name || "").trim().toLowerCase() === nameLower)

      const newStrategy =
        existingIndex >= 0
          ? {
              ...existing[existingIndex],
              name,
              enabled: true,
              detectors: selectedDetectors,
            }
          : {
              strategy_id: makeStrategyId(name),
              name,
              enabled: true,
              detectors: selectedDetectors,
              min_score: 1.0,
              min_rr: 2.0,
            }

      const newStrategies = [...existing]
      if (existingIndex >= 0) newStrategies[existingIndex] = newStrategy
      else newStrategies.push(newStrategy)

      const result = await api.updateStrategies({ strategies: newStrategies })
      if (!(result as any)?.ok) {
        throw new Error((result as any)?.error || "Failed to save")
      }

      toast({ title: "Амжилттай", description: "Хадгалагдлаа" })
      setStrategyName("")
      props.onSaved?.()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err?.message || "Хадгалахад алдаа гарлаа",
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

        {/* Right: Detector Selection */}
        <div className="space-y-4">
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
                <span className={validation.gates >= 1 ? "text-green-500" : "text-red-500"}>Gate: {validation.gates}/1+</span>
                <span className={validation.triggers >= 1 ? "text-green-500" : "text-red-500"}>Trigger: {validation.triggers}/1+</span>
                <span className={validation.confluences >= 1 ? "text-green-500" : "text-red-500"}>Confluence: {validation.confluences}/1+</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 max-h-[calc(100vh-500px)] overflow-y-auto">
            {(["gate", "trigger", "confluence"] as DetectorRole[]).map((role) => (
              <div key={role} className="mb-6 last:mb-0">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  {ROLE_LABELS[role]}
                  <span className="text-muted-foreground">
                    (
                    {
                      selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === role)
                        .length
                    }
                    сонгосон)
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {groupedDetectors[role]?.map((det) => {
                    const isSelected = selectedDetectors.includes(det.name)
                    return (
                      <button
                        key={det.name}
                        onClick={() => toggleDetector(det.name)}
                        disabled={det.required && isSelected}
                        className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? ROLE_COLORS[role]
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

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex gap-3 flex-wrap">
              <Input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} placeholder="Strategy нэр..." />
              <Button onClick={saveStrategy} disabled={!isValid || !strategyName.trim() || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Сонгосон: {selectedDetectors.length} детектор • {selectedDetectors.join(", ")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
