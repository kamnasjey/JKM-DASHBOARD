"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  BarChart3,
  Zap,
  Activity,
  Target,
  LineChart,
  CheckCircle2,
  Loader2,
  Sparkles
} from "lucide-react"

interface SimulationProgressProps {
  symbol: string
  timeframes: string[]
  isRunning: boolean
}

const SIMULATION_STEPS = [
  { id: "connect", label: "Market холбогдож байна", icon: Activity, duration: 800 },
  { id: "load", label: "Түүхэн дата татаж байна", icon: BarChart3, duration: 1500 },
  { id: "detect", label: "Pattern хайж байна", icon: Target, duration: 2000 },
  { id: "analyze", label: "Entry сигнал шүүж байна", icon: Zap, duration: 1500 },
  { id: "simulate", label: "Trade симуляц хийж байна", icon: LineChart, duration: 2500 },
  { id: "calculate", label: "Статистик тооцоолж байна", icon: TrendingUp, duration: 1000 },
]

const TRADING_QUOTES = [
  "The trend is your friend...",
  "Risk management is key...",
  "Patience pays in trading...",
  "Let winners run, cut losers short...",
  "Trade the plan, plan the trade...",
]

export function SimulationProgress({ symbol, timeframes, isRunning }: SimulationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [quote, setQuote] = useState(TRADING_QUOTES[0])
  const [pulseTf, setPulseTf] = useState<string | null>(null)

  // Progress through steps
  useEffect(() => {
    if (!isRunning) {
      setCurrentStep(0)
      setCompletedSteps([])
      return
    }

    let totalTime = 0
    const timers: NodeJS.Timeout[] = []

    SIMULATION_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index)
        if (index > 0) {
          setCompletedSteps(prev => [...prev, SIMULATION_STEPS[index - 1].id])
        }
      }, totalTime)
      timers.push(timer)
      totalTime += step.duration
    })

    // After all steps, mark last as complete and loop
    const finalTimer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, SIMULATION_STEPS[SIMULATION_STEPS.length - 1].id])
      // Loop back
      setTimeout(() => {
        if (isRunning) {
          setCurrentStep(0)
          setCompletedSteps([])
        }
      }, 1000)
    }, totalTime)
    timers.push(finalTimer)

    return () => timers.forEach(t => clearTimeout(t))
  }, [isRunning, completedSteps.length === SIMULATION_STEPS.length])

  // Rotate quotes
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setQuote(TRADING_QUOTES[Math.floor(Math.random() * TRADING_QUOTES.length)])
    }, 4000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Pulse through timeframes
  useEffect(() => {
    if (!isRunning) return
    let tfIndex = 0
    const interval = setInterval(() => {
      setPulseTf(timeframes[tfIndex])
      tfIndex = (tfIndex + 1) % timeframes.length
    }, 600)
    return () => clearInterval(interval)
  }, [isRunning, timeframes])

  const currentStepData = SIMULATION_STEPS[currentStep]
  const CurrentIcon = currentStepData?.icon || Activity
  const progress = ((currentStep + 1) / SIMULATION_STEPS.length) * 100

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      <CardContent className="py-8 relative">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="relative z-10">
          {/* Main content */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Animated icon */}
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CurrentIcon className="h-8 w-8 text-primary animate-pulse" />
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>

            {/* Symbol badge */}
            <Badge variant="outline" className="mb-3 px-4 py-1 text-base font-mono bg-background/50 backdrop-blur">
              <Sparkles className="h-3 w-3 mr-2 text-yellow-500" />
              {symbol}
            </Badge>

            {/* Current step */}
            <h3 className="text-xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {currentStepData?.label || "Analyzing..."}
            </h3>

            {/* Quote */}
            <p className="text-sm text-muted-foreground italic transition-all duration-500">
              "{quote}"
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-green-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {SIMULATION_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = index === currentStep

              return (
                <div
                  key={step.id}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted && "bg-green-500/20 text-green-500",
                    isCurrent && "bg-primary/20 text-primary scale-110",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Timeframes */}
          <div className="flex justify-center gap-2">
            {timeframes.map((tf) => (
              <Badge
                key={tf}
                variant="outline"
                className={cn(
                  "transition-all duration-200 font-mono",
                  pulseTf === tf
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25"
                    : "bg-background/50"
                )}
              >
                {tf}
              </Badge>
            ))}
          </div>

          {/* Live stats ticker */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 text-xs font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
              <span className="text-muted-foreground">|</span>
              <span>5 TFs scanning</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-primary">Pattern matching...</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
