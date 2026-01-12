import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">JKM COPILOT</h1>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Нэвтрэх</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Бүртгүүлэх</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
