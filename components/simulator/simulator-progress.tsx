"use client"

import { useEffect, useState, useCallback } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface ProgressData {
  stage: string
  percent: number
  message: string
}

interface SimulatorProgressProps {
  isRunning: boolean
  jobId?: string | null
  onComplete?: () => void
}

export function SimulatorProgress({ isRunning, jobId, onComplete }: SimulatorProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    stage: "starting",
    percent: 0,
    message: "Эхлүүлж байна...",
  })
  const [status, setStatus] = useState<"queued" | "running" | "completed" | "failed">("queued")

  // Poll for progress when jobId is provided
  const pollProgress = useCallback(async () => {
    if (!jobId) return

    try {
      const res = await fetch(`/api/simulator/job/${jobId}`)
      const data = await res.json()

      if (data.ok && data.job) {
        const job = data.job
        setStatus(job.status)

        if (job.progress) {
          setProgress({
            stage: job.progress.stage || "running",
            percent: job.progress.percent || 0,
            message: job.progress.message || "Ажиллаж байна...",
          })
        }

        if (job.status === "completed") {
          setProgress({ stage: "done", percent: 100, message: "Дууссан" })
          onComplete?.()
          return true // Stop polling
        }

        if (job.status === "failed") {
          setProgress({ stage: "error", percent: 0, message: "Алдаа гарлаа" })
          return true // Stop polling
        }
      }
    } catch (err) {
      console.error("[SimulatorProgress] Poll error:", err)
    }
    return false // Continue polling
  }, [jobId, onComplete])

  useEffect(() => {
    if (!isRunning) {
      setProgress({ stage: "starting", percent: 0, message: "Эхлүүлж байна..." })
      setStatus("queued")
      return
    }

    if (!jobId) {
      // No jobId - use fake progress animation
      let fakePercent = 0
      const fakeMessages = [
        "Стратеги шалгаж байна...",
        "Түүхэн дата ачаалж байна...",
        "Detector-ууд ажиллаж байна...",
        "Симуляци хийж байна...",
        "Бэлэн болж байна...",
      ]

      const interval = setInterval(() => {
        fakePercent += 3
        if (fakePercent > 95) fakePercent = 95

        const msgIndex = Math.min(Math.floor(fakePercent / 20), fakeMessages.length - 1)
        setProgress({
          stage: "simulating",
          percent: fakePercent,
          message: fakeMessages[msgIndex],
        })
      }, 500)

      return () => clearInterval(interval)
    }

    // Real progress polling with jobId
    const pollInterval = setInterval(async () => {
      const shouldStop = await pollProgress()
      if (shouldStop) {
        clearInterval(pollInterval)
      }
    }, 1000)

    // Initial poll
    pollProgress()

    return () => clearInterval(pollInterval)
  }, [isRunning, jobId, pollProgress])

  if (!isRunning) return null

  const isDone = progress.stage === "done" || status === "completed"
  const isError = progress.stage === "error" || status === "failed"

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Явц</span>
          <span className="font-medium">{progress.percent}%</span>
        </div>
        <Progress
          value={progress.percent}
          className={cn(
            "h-2",
            isDone && "bg-green-500/20",
            isError && "bg-red-500/20"
          )}
        />
      </div>

      {/* Status message */}
      <div className="flex items-center gap-3">
        {isDone ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : isError ? (
          <span className="w-5 h-5 text-red-500 flex-shrink-0">✕</span>
        ) : (
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
        )}
        <span
          className={cn(
            "text-sm",
            isDone && "text-green-500",
            isError && "text-red-500",
            !isDone && !isError && "text-primary font-medium"
          )}
        >
          {progress.message}
        </span>
      </div>

      {/* Timeframe info when available */}
      {progress.stage.startsWith("simulating_") && (
        <p className="text-xs text-muted-foreground text-center">
          {progress.stage.replace("simulating_", "").toUpperCase()} timeframe
        </p>
      )}
    </div>
  )
}
