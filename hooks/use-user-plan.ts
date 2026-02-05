"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import type { PlanType } from "@/lib/constants/pricing"

interface UserPlanData {
  plan: PlanType
  planStatus: "pending" | "active" | "expired"
  hasPaidAccess: boolean
  loading: boolean
  error: string | null
}

export function useUserPlan(): UserPlanData {
  const { data: session, status } = useSession()
  const [planData, setPlanData] = useState<UserPlanData>({
    plan: "free",
    planStatus: "active",
    hasPaidAccess: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      setPlanData({
        plan: "free",
        planStatus: "active",
        hasPaidAccess: false,
        loading: false,
        error: null,
      })
      return
    }

    const userId = (session.user as any)?.id
    if (!userId) {
      setPlanData((prev) => ({ ...prev, loading: false }))
      return
    }

    // Fetch user plan data from API
    async function fetchPlanData() {
      try {
        const res = await fetch(`/api/user/plan`)
        if (!res.ok) {
          throw new Error("Failed to fetch plan data")
        }
        const data = await res.json()
        setPlanData({
          plan: data.plan || "starter",
          planStatus: data.planStatus || "active",
          hasPaidAccess: data.hasPaidAccess || false,
          loading: false,
          error: null,
        })
      } catch (err) {
        console.error("[useUserPlan] Error fetching plan:", err)
        // Default to starter plan on error
        setPlanData({
          plan: "free",
          planStatus: "active",
          hasPaidAccess: false,
          loading: false,
          error: "Failed to load plan data",
        })
      }
    }

    fetchPlanData()
  }, [session, status])

  return planData
}
