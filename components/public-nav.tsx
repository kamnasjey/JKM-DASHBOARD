"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { signIn, signOut, useSession } from "next-auth/react"

export function PublicNav() {
  const { status } = useSession()
  const authed = status === "authenticated"

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-foreground">
          JKM Trading AI
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => scrollToSection("features")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Онцлог
          </button>
          <button
            onClick={() => scrollToSection("how")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Яаж ажилладаг вэ?
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Үнэ
          </button>
        </div>

        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
                Гарах
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
                Нэвтрэх
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
