"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton({ fallbackHref = "/", className }: { fallbackHref?: string; className?: string }) {
  const router = useRouter()

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onBack}
      className={className}
      aria-label="Буцах"
      title="Буцах"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  )
}
