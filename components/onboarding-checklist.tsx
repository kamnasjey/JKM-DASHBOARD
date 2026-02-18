"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, X, ArrowRight, Rocket } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { api } from "@/lib/api"

interface ChecklistItem {
  id: string
  labelMn: string
  labelEn: string
  href?: string
  autoCheck?: boolean // Checked by API, not user action
}

const ITEMS: ChecklistItem[] = [
  { id: "account", labelMn: "Бүртгэл үүсгэсэн", labelEn: "Account created", autoCheck: true },
  { id: "strategy", labelMn: "Стратеги сонгох", labelEn: "Choose a strategy", href: "/strategies" },
  { id: "telegram", labelMn: "Telegram холбох", labelEn: "Connect Telegram", href: "/profile" },
  { id: "first_signal", labelMn: "Эхний дохио хүлээж авах", labelEn: "Receive first signal", autoCheck: true },
]

const STORAGE_KEY = "jkm_onboarding"

interface OnboardingState {
  dismissed: boolean
  completed: string[]
}

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { dismissed: false, completed: ["account"] } // Endowed progress
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function OnboardingChecklist() {
  const { t } = useLanguage()
  const [state, setState] = useState<OnboardingState>({ dismissed: true, completed: [] })
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const s = loadState()
    setState(s)
    setLoaded(true)
  }, [])

  // Auto-check strategy and telegram status from API
  const checkStatus = useCallback(async () => {
    try {
      const [profileRes, strategiesRes] = await Promise.all([
        api.profile().catch(() => null),
        api.strategiesV2.list({ limit: 1 }).catch(() => null),
      ])

      setState(prev => {
        const completed = new Set(prev.completed)
        completed.add("account")

        // Check if user has at least 1 strategy
        const strategies = (strategiesRes as any)?.strategies || []
        if (strategies.length > 0) completed.add("strategy")

        // Check Telegram connection
        if (profileRes?.telegram_chat_id) completed.add("telegram")

        const newState = { ...prev, completed: Array.from(completed) }
        saveState(newState)
        return newState
      })
    } catch {}
  }, [])

  useEffect(() => {
    if (loaded && !state.dismissed) {
      checkStatus()
    }
  }, [loaded, state.dismissed, checkStatus])

  // Don't render if dismissed or all items done or not loaded yet
  if (!loaded || state.dismissed) return null
  if (state.completed.length >= ITEMS.length) return null

  const progress = Math.round((state.completed.length / ITEMS.length) * 100)

  const handleDismiss = () => {
    const newState = { ...state, dismissed: true }
    setState(newState)
    saveState(newState)
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">
                {t("Getting Started", "Эхлэх тохиргоо")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(`${progress}% complete`, `${progress}% дууссан`)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleDismiss} title={t("Dismiss", "Хаах")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {ITEMS.map(item => {
            const done = state.completed.includes(item.id)
            return (
              <div key={item.id} className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {t(item.labelEn, item.labelMn)}
                </span>
                {!done && item.href && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                    <Link href={item.href}>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
