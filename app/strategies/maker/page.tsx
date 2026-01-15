"use client"

import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuthGuard } from "@/lib/auth-guard"
import { StrategyMakerPanel } from "@/components/strategy-maker-panel"

export default function StrategiesMakerPage() {
  useAuthGuard(true)

  const router = useRouter()
  return (
    <DashboardLayout>
      <StrategyMakerPanel
        onCancel={() => router.push("/strategies")}
        onSaved={() => router.push("/strategies")}
      />
    </DashboardLayout>
  )
}
