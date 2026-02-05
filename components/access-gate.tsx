"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Loader2, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"

interface AccessGateProps {
  children: React.ReactNode
  feature: "scanner" | "simulator" | "strategies" | "signals" | "dashboard"
}

const FEATURE_NAMES: Record<string, string> = {
  scanner: "Scanner",
  simulator: "Simulator",
  strategies: "Strategies",
  signals: "Setups",
  dashboard: "Dashboard",
}

export function AccessGate({ children, feature }: AccessGateProps) {
  const { plan, planStatus, hasPaidAccess, loading, error } = useUserPlan()

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Free plan - show locked overlay
  if (plan === "free") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">
                {FEATURE_NAMES[feature]} түгжээтэй байна
              </h2>
              <p className="text-sm text-muted-foreground">
                Энэ функц нь төлбөртэй хэрэглэгчдэд нээлттэй.
                <br />
                Төлбөрийн төлөвлөгөө сонгоод бүрэн эрх авна уу.
              </p>
              <div className="pt-2">
                <Button asChild>
                  <Link href="/pricing">Төлөвлөгөө сонгох</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Paid plan but pending approval - show waiting state
  if (!hasPaidAccess) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-semibold">
                Таны төлбөр шалгагдаж байна
              </h2>
              <p className="text-sm text-muted-foreground">
                Төлбөр баталгаажсаны дараа 24 цагийн дотор таны эрх нээгдэнэ.
                <br />
                Асуудал гарвал: <span className="text-primary">support@jkmcopilot.com</span>
              </p>
              <div className="pt-2 flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Dashboard руу буцах</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Has paid access - show content
  return <>{children}</>
}

// For pages that starter users CAN view but can't use features
export function AccessGateViewOnly({ children, feature }: AccessGateProps) {
  const { plan, hasPaidAccess, loading } = useUserPlan()

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Free plan - show content with banner
  if (plan === "free") {
    return (
      <div>
        <div className="bg-muted/50 border-b px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Та үнэгүй хэрэглэгч байна. {FEATURE_NAMES[feature]} ашиглахын тулд төлөвлөгөө сонгоно уу.
              </span>
            </div>
            <Button size="sm" asChild>
              <Link href="/pricing">Төлөвлөгөө сонгох</Link>
            </Button>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Paid but pending
  if (!hasPaidAccess) {
    return (
      <div>
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-600 dark:text-yellow-400">
                Таны төлбөр шалгагдаж байна. 24 цагийн дотор эрх нээгдэнэ.
              </span>
            </div>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Has paid access
  return <>{children}</>
}
