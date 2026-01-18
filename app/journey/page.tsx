"use client"

import { useState, useEffect } from "react"
import { Trophy, Award, Flame, CheckCircle2, Circle, BookOpen } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getJourneyProgress, setJourneyProgress } from "@/lib/storage"
import type { JourneyProgress } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

const missions = [
  {
    id: "understand_rr",
    stage: "Beginner",
    title: "RR ойлгох",
    description: "Risk/Reward ratio гэж юу болохыг ойлгох",
    xp: 10,
  },
  {
    id: "review_signal",
    stage: "Beginner",
    title: "1 сигнал дээр plan бичих",
    description: "Signal detail хуудас руу орж, replay mode-г унших",
    xp: 15,
  },
  {
    id: "set_risk",
    stage: "Beginner",
    title: "Risk per trade 1% тохируулах",
    description: "Risk хуудас руу орж, өөрийн risk settings-г оруулах",
    xp: 20,
  },
  {
    id: "learn_strategy",
    stage: "Intermediate",
    title: "Стратеги судлах",
    description: "Strategies хуудас руу орж, стратегийн тохиргоог харах",
    xp: 25,
  },
  {
    id: "journal_week",
    stage: "Intermediate",
    title: "7 хоног journal хөтлөх",
    description: "Долоо хоног бүр тэмдэглэл хөтлөх",
    xp: 30,
  },
  {
    id: "consistency",
    stage: "Pro",
    title: "Сахилга бат",
    description: "10 trade дээр дүрмээ дагаж ажиллах",
    xp: 50,
  },
  {
    id: "system_thinking",
    stage: "Pro",
    title: "System thinking",
    description: "Өөрийн trading системийг үүсгэх",
    xp: 50,
  },
]

const knowledgeCards = [
  {
    stage: "Beginner",
    title: "Risk Management Basics",
    content:
      "Risk management бол trading-ийн хамгийн чухал хэсэг. Таны account-г хамгаалах анхны алхам. 1-2% risk per trade ашиглаарай.",
  },
  {
    stage: "Beginner",
    title: "RR (Risk/Reward)",
    content: "RR ratio нь таны хожих боломжтой мөнгө ба алдах боломжтой мөнгийн харьцаа. Доод тал нь 2:1 байх ёстой.",
  },
  {
    stage: "Intermediate",
    title: "Strategy Consistency",
    content: "Амжилттай trader бол тогтвортой trader. Нэг стратегийг сайн мэдэх нь олон стратегийг муу мэдэхээс дээр.",
  },
  {
    stage: "Intermediate",
    title: "Journaling",
    content:
      "Trading journal хөтлөх нь таны trading-г сайжруулах хамгийн үр дүнтэй арга. Бүх trade-аа тэмдэглэж, дүн шинжилгээ хийгээрэй.",
  },
  {
    stage: "Pro",
    title: "Position Sizing",
    content:
      "Account-нийхаа хэдэн хувийг нэг trade дээр risk хийхээ мэдэх нь амжилтын түлхүүр. Kelly Criterion болон fixed % аргыг судлаарай.",
  },
  {
    stage: "Pro",
    title: "System Thinking",
    content: "Ганц trade биш, систем чухал. Таны edge нь олон trade-д харагдана. Probability-тэй бодож сураарай.",
  },
]

export default function JourneyPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [progress, setProgress] = useState<JourneyProgress | null>(null)

  useEffect(() => {
    const stored = getJourneyProgress()
    if (stored) {
      setProgress(stored)
    } else {
      const defaultProgress: JourneyProgress = {
        level: "Beginner",
        xp: 0,
        completedMissions: [],
        badges: [],
        streak: 0,
      }
      setProgress(defaultProgress)
      setJourneyProgress(defaultProgress)
    }
  }, [])

  const completeMission = (missionId: string) => {
    if (!progress) return

    if (progress.completedMissions.includes(missionId)) {
      toast({
        title: "Энэ миссийг аль хэдийн гүйцэтгэсэн",
        variant: "destructive",
      })
      return
    }

    const mission = missions.find((m) => m.id === missionId)
    if (!mission) return

    const newXp = progress.xp + mission.xp
    const newCompleted = [...progress.completedMissions, missionId]

    // Level up logic
    let newLevel = progress.level
    if (newXp >= 100 && progress.level === "Beginner") {
      newLevel = "Intermediate"
      toast({
        title: "Level Up!",
        description: "Та Intermediate түвшинд хүрлээ!",
      })
    } else if (newXp >= 250 && progress.level === "Intermediate") {
      newLevel = "Pro"
      toast({
        title: "Level Up!",
        description: "Та Pro түвшинд хүрлээ!",
      })
    }

    const newProgress: JourneyProgress = {
      ...progress,
      xp: newXp,
      level: newLevel,
      completedMissions: newCompleted,
    }

    setProgress(newProgress)
    setJourneyProgress(newProgress)

    toast({
      title: "Миссийг гүйцэтгэлээ!",
      description: `+${mission.xp} XP`,
    })
  }

  if (!progress) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  const xpToNextLevel = progress.level === "Beginner" ? 100 : progress.level === "Intermediate" ? 250 : 500
  const xpProgress = (progress.xp / xpToNextLevel) * 100

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Trader Journey</h1>
          <p className="text-muted-foreground">Beginner-ээс Pro болох зам</p>
        </div>

        {/* Progress Overview */}
        <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Таны прогресс
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Одоогийн түвшин</p>
                <Badge variant="default" className="mt-1">
                  {progress.level}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Нийт XP</p>
                <p className="text-2xl font-bold">
                  {progress.xp} / {xpToNextLevel}
                </p>
              </div>
            </div>
            <Progress value={xpProgress} className="h-3" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Streak: {progress.streak} хоног</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>Badges: {progress.badges?.length ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Roadmap</CardTitle>
            <CardDescription>3 үе шат: Beginner → Intermediate → Pro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {["Beginner", "Intermediate", "Pro"].map((stage) => {
                const stageMissions = missions.filter((m) => m.stage === stage)
                const completedCount = stageMissions.filter((m) => progress.completedMissions.includes(m.id)).length

                return (
                  <div key={stage} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{stage}</h3>
                      <Badge variant="outline">
                        {completedCount} / {stageMissions.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {stageMissions.map((mission) => {
                        const completed = progress.completedMissions.includes(mission.id)
                        return (
                          <div
                            key={mission.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                          >
                            <div className="flex items-center gap-3">
                              {completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{mission.title}</p>
                                <p className="text-sm text-muted-foreground">{mission.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">+{mission.xp} XP</Badge>
                              {!completed && (
                                <Button size="sm" onClick={() => completeMission(mission.id)}>
                                  Гүйцэтгэх
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>Trading мэдлэгийн санг нээх</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {knowledgeCards.map((card, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{card.stage}</Badge>
                      <span>{card.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">{card.content}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Motivational Section */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-card">
          <CardContent className="py-6">
            <blockquote className="text-center">
              <p className="text-lg italic text-foreground">
                "Амжилттай trader бол тогтвортой trader. Хурдан баян болох гэж бодохоо боль. Урт хугацааны тоглоом
                тоглооорой."
              </p>
              <footer className="mt-2 text-sm text-muted-foreground">- Trading Wisdom</footer>
            </blockquote>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
