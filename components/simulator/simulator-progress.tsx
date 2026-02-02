"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Database, Shield, Search, TrendingUp, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SIMULATOR_STEPS } from "./progress-steps"

const ICONS = {
  CheckCircle,
  Database,
  Shield,
  Search,
  TrendingUp,
  Sparkles,
}

interface SimulatorProgressProps {
  isRunning: boolean
  onComplete?: () => void
}

export function SimulatorProgress({ isRunning, onComplete }: SimulatorProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    if (!isRunning) {
      setCurrentStep(0)
      setCompletedSteps([])
      return
    }

    let stepIndex = 0
    let timeoutId: NodeJS.Timeout

    const runStep = () => {
      if (stepIndex >= SIMULATOR_STEPS.length) {
        onComplete?.()
        return
      }

      setCurrentStep(stepIndex)
      const step = SIMULATOR_STEPS[stepIndex]

      timeoutId = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex])
        stepIndex++
        runStep()
      }, step.duration)
    }

    runStep()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isRunning, onComplete])

  if (!isRunning) return null

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
      {SIMULATOR_STEPS.map((step, idx) => {
        const Icon = ICONS[step.icon as keyof typeof ICONS]
        const isActive = currentStep === idx
        const isCompleted = completedSteps.includes(idx)

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 transition-all duration-300",
              isActive ? "opacity-100" : isCompleted ? "opacity-60" : "opacity-30"
            )}
          >
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : isActive ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-sm",
                isActive && "text-primary font-medium",
                isCompleted && "text-muted-foreground line-through"
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
