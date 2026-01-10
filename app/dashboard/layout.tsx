import type React from "react"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { getAuthOptions } from "@/lib/nextauth"

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(getAuthOptions())
  if (!session) {
    redirect("/login")
  }

  return <>{children}</>
}
