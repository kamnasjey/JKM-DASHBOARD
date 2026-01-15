"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Check, AlertTriangle, Zap, ChevronRight, Save } from "lucide-react";

// Types
type DetectorRole = "gate" | "trigger" | "confluence";

interface Message {
  role: "user" | "assistant";
  content: string;
  detectors?: string[];
}

interface Detector {
  name: string;
  role: DetectorRole;
  description: string;
  required?: boolean;
}

// All 20 detectors
const ALL_DETECTORS: Detector[] = [
  // Gates
  { name: "gate_regime", role: "gate", description: "Зах зээл Trend/Range/Chop байгааг тодорхойлно", required: true },
  { name: "gate_volatility", role: "gate", description: "Volatility өндөр/бага/хэвийн гэдгийг хэмжинэ" },
  { name: "gate_drift_sentinel", role: "gate", description: "Детекторын гүйцэтгэл муудаж байгааг анхааруулна" },
  
  // Triggers
  { name: "pinbar", role: "trigger", description: "Урт сүүлтэй rejection лаа" },
  { name: "engulfing", role: "trigger", description: "Өмнөх лааг бүрэн залгисан лаа" },
  { name: "sr_bounce", role: "trigger", description: "S/R түвшингээс эргэлт" },
  { name: "sr_breakout", role: "trigger", description: "S/R түвшинг эвдэж гарсан" },
  { name: "compression_expansion", role: "trigger", description: "Volatility шахагдаад дэлбэрэх" },
  { name: "momentum_continuation", role: "trigger", description: "Impulse → pullback → break" },
  { name: "mean_reversion_snapback", role: "trigger", description: "Дундаж руу буцах" },
  
  // Confluence
  { name: "doji", role: "confluence", description: "Шийдэмгий бус лаа (нээлт≈хаалт)" },
  { name: "pinbar_at_level", role: "confluence", description: "Чухал түвшин дээр гарсан пинбар" },
  { name: "fibo_retracement", role: "confluence", description: "Fibo 38.2%, 50%, 61.8% түвшин" },
  { name: "fibo_extension", role: "confluence", description: "Fibo 127.2%, 161.8% зорилтот түвшин" },
  { name: "fibo_retrace_confluence", role: "confluence", description: "Олон Фибо түвшин давхцаж байгаа" },
  { name: "structure_trend", role: "confluence", description: "HH/HL эсвэл LH/LL бүтэц" },
  { name: "swing_failure", role: "confluence", description: "Swing-г гаргаад буцсан (SFP)" },
  { name: "range_box_edge", role: "confluence", description: "Range хязгаар дээр хариу үйлдэл" },
  { name: "fakeout_trap", role: "confluence", description: "Range-аас гарсан мэт харагдаад буцсан" },
  { name: "sr_role_reversal", role: "confluence", description: "Resistance → Support эсвэл эсрэгээр" },
];

const ROLE_LABELS: Record<DetectorRole, string> = {
  gate: "🚦 Gate (Шүүлт)",
  trigger: "⚡ Trigger (Entry)",
  confluence: "🎯 Confluence (Баталгаа)",
};

const ROLE_COLORS: Record<DetectorRole, string> = {
  gate: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
  trigger: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  confluence: "bg-green-500/20 border-green-500/50 text-green-300",
};

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: `👋 Сайн байна уу! Би таны **Strategy Maker AI** туслах байна.

Танд 20 детектор байгаа бөгөөд би таны trading арга барилыг ойлгоод хамгийн тохиромжтой detector combo-г сонгоход тусална.

**Надад дараах зүйлсийг хэлээрэй:**
- Та ямар төрлийн trader бэ? (Trend follower, Range trader, Scalper, Swing trader...)
- Таны risk tolerance ямар вэ? (Аюулгүй, Дунд, Өндөр эрсдэл)
- Ямар timeframe дээр trade хийдэг вэ? (1m, 5m, 15m, 1H, 4H, Daily...)
- Ямар зах зээл дээр trade хийдэг вэ? (Forex, Crypto, Indices, Commodities...)

Жишээ: "Би trend follower, 4H timeframe дээр BTCUSD trade хийдэг, дунд зэргийн эрсдэл авдаг"`,
};

export default function StrategyMakerPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDetectors, setSelectedDetectors] = useState<string[]>(["gate_regime"]);
  const [strategyName, setStrategyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/strategy-maker/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          current_detectors: selectedDetectors,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        detectors: data.recommended_detectors,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-select recommended detectors
      if (data.recommended_detectors?.length > 0) {
        setSelectedDetectors(data.recommended_detectors);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDetector = (name: string) => {
    const detector = ALL_DETECTORS.find((d) => d.name === name);
    if (detector?.required && selectedDetectors.includes(name)) return;

    if (selectedDetectors.includes(name)) {
      setSelectedDetectors(selectedDetectors.filter((d) => d !== name));
    } else {
      setSelectedDetectors([...selectedDetectors, name]);
    }
  };

  const saveStrategy = async () => {
    if (!strategyName.trim()) {
      alert("Strategy нэр оруулна уу");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: strategyName,
          detectors: selectedDetectors,
        }),
      });

      if (response.ok) {
        alert("Strategy амжилттай хадгалагдлаа!");
        setStrategyName("");
      }
    } catch (error) {
      alert("Хадгалахад алдаа гарлаа");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedDetectors = ALL_DETECTORS.reduce((acc, det) => {
    if (!acc[det.role]) acc[det.role] = [];
    acc[det.role].push(det);
    return acc;
  }, {} as Record<DetectorRole, Detector[]>);

  const validation = {
    gates: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "gate").length,
    triggers: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "trigger").length,
    confluences: selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === "confluence").length,
  };

  const isValid = validation.gates >= 1 && validation.triggers >= 1 && validation.confluences >= 1;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">STRATEGY MAKER</h1>
              <p className="text-sm text-gray-400">AI-powered detector combination</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: AI Chat */}
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 flex flex-col h-[calc(100vh-180px)]">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-medium">AI Strategy Assistant</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-blue-500" : "bg-purple-500"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    </div>
                    {msg.detectors && msg.detectors.length > 0 && (
                      <div className="mt-2 p-3 bg-green-500/20 border border-green-500/50 rounded-xl">
                        <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Санал болгож буй детекторууд:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.detectors.map((d) => (
                            <span key={d} className="px-2 py-1 bg-green-500/30 rounded text-xs font-mono">
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
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-700 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Өөрийн trading арга барилаа бичээрэй..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Detector Selection */}
          <div className="space-y-4">
            {/* Validation Status */}
            <div className={`p-4 rounded-xl border ${isValid ? "bg-green-500/20 border-green-500/50" : "bg-yellow-500/20 border-yellow-500/50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <span className={isValid ? "text-green-300" : "text-yellow-300"}>
                    {isValid ? "Strategy бэлэн!" : "Дутуу детектор байна"}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className={validation.gates >= 1 ? "text-green-400" : "text-red-400"}>
                    Gate: {validation.gates}/1+
                  </span>
                  <span className={validation.triggers >= 1 ? "text-green-400" : "text-red-400"}>
                    Trigger: {validation.triggers}/1+
                  </span>
                  <span className={validation.confluences >= 1 ? "text-green-400" : "text-red-400"}>
                    Confluence: {validation.confluences}/1+
                  </span>
                </div>
              </div>
            </div>

            {/* Detectors by role */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-4 max-h-[calc(100vh-360px)] overflow-y-auto">
              {(["gate", "trigger", "confluence"] as DetectorRole[]).map((role) => (
                <div key={role} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    {ROLE_LABELS[role]}
                    <span className="text-gray-500">
                      ({selectedDetectors.filter((d) => ALL_DETECTORS.find((det) => det.name === d)?.role === role).length} сонгосон)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {groupedDetectors[role]?.map((det) => {
                      const isSelected = selectedDetectors.includes(det.name);
                      return (
                        <button
                          key={det.name}
                          onClick={() => toggleDetector(det.name)}
                          disabled={det.required && isSelected}
                          className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? ROLE_COLORS[role]
                              : "border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300"
                          } ${det.required ? "ring-1 ring-yellow-500/50" : ""}`}
                        >
                          <div>
                            <div className="font-mono text-sm">{det.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{det.description}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Strategy */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="Strategy нэр..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={saveStrategy}
                  disabled={!isValid || !strategyName.trim() || isSaving}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Хадгалах
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                Сонгосон: {selectedDetectors.length} детектор • {selectedDetectors.join(", ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
