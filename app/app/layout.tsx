import type React from "react"
import { AppClientLayout } from "@/components/app-client-layout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppClientLayout>{children}</AppClientLayout>
}
