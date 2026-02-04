"use client"

import { useEffect, useRef, useState } from "react"
import {
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
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

interface Message {
  role: "user" | "assistant"
  content: string
  detectors?: string[]
}

const MAX_STRATEGIES = 30
const MIN_RR = 2.7

// JKM Copilot санал болгосон strategy templates
// Backtest-тэй, 60%+ WR
const JKM_RECOMMENDED_TEMPLATES = [
  {
    id: "trend_breakout",
    name: "Trend Breakout",
    description: "Trend-ийн дагуу breakout барих. BOS + Pinbar confluence.",
    detectors: ["gate_regime", "bos", "pinbar_at_level"],
    winRate: "70%+",
    style: "Trend Following",
  },
  {
    id: "reversal_hunter",
    name: "Reversal Hunter",
    description: "Чиглэл өөрчлөлт барих. CHOCH + Engulfing confluence.",
    detectors: ["gate_regime", "choch", "engulf_at_level"],
    winRate: "65%+",
    style: "Reversal",
  },
  {
    id: "sr_bounce_pro",
    name: "S/R Bounce Pro",
    description: "S/R түвшнээс bounce барих. Pinbar баталгаажуулалттай.",
    detectors: ["gate_regime", "sr_bounce", "pinbar_at_level"],
    winRate: "62%+",
    style: "Range Trading",
  },
  {
    id: "momentum_rider",
    name: "Momentum Rider",
    description: "Хүчтэй momentum-ийн continuation барих.",
    detectors: ["gate_regime", "gate_volatility", "momentum_continuation", "fibo_retrace_confluence"],
    winRate: "68%+",
    style: "Momentum",
  },
  {
    id: "smart_money",
    name: "Smart Money Concepts",
    description: "Order Block + Liquidity Sweep combo.",
    detectors: ["gate_regime", "ob", "sweep", "fvg"],
    winRate: "65%+",
    style: "SMC/ICT",
  },
  {
    id: "conservative_safe",
    name: "Conservative Safe",
    description: "Бага эрсдэлтэй, олон баталгаажуулалттай.",
    detectors: ["gate_regime", "gate_volatility", "break_retest", "sr_role_reversal", "pinbar_at_level"],
    winRate: "72%+",
    style: "Conservative",
  },
]

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    `Сайн байна уу! 👋\n\n` +
    `Би таны арилжааны арга барилд тохирсон **strategy бүтээж өгнө**.\n\n` +
    `📝 **Өөрийн арга барилаа бичээрэй:**\n\n` +
    `• Ямар төрлийн trader бэ? (trend follower, scalper, swing...)\n` +
    `• Ямар зах зээл? (Forex, Crypto, Gold...)\n` +
    `• Ямар timeframe? (5m, 15m, 1H, 4H...)\n` +
    `• Ямар entry? (breakout, pullback, reversal...)\n\n` +
    `**Жишээ:** "Би crypto дээр swing trade хийдэг, 4H timeframe, trend дагуу breakout илүүд үздэг."\n\n` +
    `💡 Эсвэл баруун талаас JKM санал болгосон template сонгоорой!`,
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
  const [selectedDetectors, setSelectedDetectors] = useState<string[]>([])
  const [strategyName, setStrategyName] = useState("")
  const [minScore, setMinScore] = useState(1.0)
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Apply template
  const applyTemplate = (template: typeof JKM_RECOMMENDED_TEMPLATES[0]) => {
    setSelectedDetectors(template.detectors)
    setStrategyName(template.name)
    setMinScore(1.0)
    toast({
      title: "Template сонгогдлоо",
      description: `${template.name} - ${template.style}`
    })
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

      // Update min_score if AI recommended one
      if (data.recommended_min_score && data.recommended_min_score >= 0.5 && data.recommended_min_score <= 3.0) {
        setMinScore(data.recommended_min_score)
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

  const isValid = selectedDetectors.length >= 2

  const saveStrategy = async () => {
    const name = strategyName.trim()

    if (!name) {
      toast({
        title: "Нэр оруулна уу",
        description: "Strategy нэр заавал байх ёстой",
        variant: "destructive"
      })
      return
    }

    if (!isValid) {
      toast({
        title: "Детектор дутуу",
        description: "AI-с strategy авах эсвэл template сонгоно уу",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await api.strategiesV2.create({
        name,
        enabled: true,
        detectors: selectedDetectors,
        config: {
          min_score: minScore,
          min_rr: MIN_RR,
        },
      })

      if (!result.ok) {
        const errorData = result as any
        const errorMessage = errorData.message || errorData.error || "Unknown error"

        if (errorMessage.includes("Maximum") || errorMessage.includes("LIMIT")) {
          toast({
            title: "Хязгаарлалт",
            description: `Хамгийн ихдээ ${MAX_STRATEGIES} strategy.`,
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Алдаа",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      toast({ title: "Амжилттай!", description: "Strategy хадгалагдлаа" })
      setStrategyName("")
      setSelectedDetectors([])
      props.onSaved?.()
    } catch (err: any) {
      toast({
        title: "Алдаа",
        description: err?.message || "Хадгалах үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Strategy Maker</h2>
            <p className="text-sm text-muted-foreground">
              Арга барилаа бичээд AI strategy бүтээнэ
            </p>
          </div>
        </div>
        {props.onCancel && (
          <Button variant="outline" onClick={props.onCancel}>
            ← Жагсаалт руу
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Chat (2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border bg-card flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
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
                <div className={`max-w-[85%] ${msg.role === "user" ? "text-right" : ""}`}>
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
                        AI үүсгэсэн детекторууд:
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
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Өөрийн trading арга барилаа бичээрэй..."
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Templates + Save (1 column) */}
        <div className="space-y-4">
          {/* JKM Recommended Templates */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              ⭐ JKM санал болгосон
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {JKM_RECOMMENDED_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    strategyName === template.name
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-border bg-background hover:border-purple-500/50 hover:bg-purple-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <span className="text-xs text-green-500">{template.winRate}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {template.detectors.slice(0, 3).map((d) => (
                      <span key={d} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                        {d}
                      </span>
                    ))}
                    {template.detectors.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                        +{template.detectors.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Detectors */}
          {selectedDetectors.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Сонгогдсон ({selectedDetectors.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {selectedDetectors.map((d) => (
                  <span key={d} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Save Section */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium mb-4">💾 Хадгалах</h3>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="strategy-name">Strategy нэр</Label>
                <Input
                  id="strategy-name"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="My Strategy"
                />
              </div>

              {/* Min Score */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Min Score</Label>
                  <span className="text-sm font-medium">{minScore.toFixed(1)}</span>
                </div>
                <Slider
                  value={[minScore]}
                  onValueChange={([val]) => setMinScore(val)}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                />
                <p className="text-[10px] text-muted-foreground">
                  Өндөр = чанартай сигнал, бага давтамж
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={saveStrategy}
                disabled={!isValid || !strategyName.trim() || isSaving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Хадгалж байна..." : "Strategy хадгалах"}
              </Button>

              {!isValid && (
                <p className="text-xs text-yellow-500 text-center">
                  ⚠️ AI-с strategy авах эсвэл template сонгоно уу
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
