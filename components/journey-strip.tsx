"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getJourneyProgress } from "@/lib/storage"
import type { JourneyProgress } from "@/lib/types"

export function JourneyStrip() {
  const router = useRouter()
  const [progress, setProgress] = useState<JourneyProgress | null>(null)

  useEffect(() => {
    const stored = getJourneyProgress()
    if (stored) {
      setProgress(stored)
    } else {
      // Initialize default progress
      const defaultProgress: JourneyProgress = {
        level: "Beginner",
        xp: 0,
        completedMissions: [],
        badges: [],
        streak: 0,
      }
      setProgress(defaultProgress)
    }
  }, [])

  if (!progress) return null

  const xpToNextLevel = progress.level === "Beginner" ? 100 : progress.level === "Intermediate" ? 250 : 500
  const xpProgress = (progress.xp / xpToNextLevel) * 100

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Trader Journey</h3>
              <Badge variant="secondary">{progress.level}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={xpProgress} className="h-2 w-32" />
              <span className="text-xs text-muted-foreground">
                {progress.xp} / {xpToNextLevel} XP
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Дараагийн алхам: Миссийг гүйцэтгэх</p>
          <Button size="sm" onClick={() => router.push("/journey")}>
            Journey
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
