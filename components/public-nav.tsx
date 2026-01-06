"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getToken, clearToken } from "@/lib/auth-guard"
import { useRouter } from "next/navigation"

export function PublicNav() {
  const [hasToken, setHasToken] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setHasToken(!!getToken())
  }, [])

  const handleLogout = () => {
    clearToken()
    setHasToken(false)
    router.push("/")
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-foreground">
          JKM Trading AI
        </Link>

        {/* Center Links */}
        <div className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => scrollToSection("features")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Онцлог
          </button>
          <button
            onClick={() => scrollToSection("how")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Яаж ажилладаг вэ?
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Үнэ
          </button>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          {hasToken ? (
            <>
              <Button asChild>
                <Link href="/dashboard">Dashboard руу орох</Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                Гарах
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/auth/login">Нэвтрэх</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Бүртгүүлэх</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
