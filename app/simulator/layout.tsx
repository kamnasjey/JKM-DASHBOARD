import type React from "react"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { getAuthOptions } from "@/lib/nextauth"
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function SimulatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(getAuthOptions())
  if (!session) {
    redirect("/login")
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
