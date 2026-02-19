"use client"

import { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ScrollTableWrapper({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      setCanScrollRight(el.scrollWidth > el.clientWidth + el.scrollLeft + 1)
    }

    check()
    el.addEventListener("scroll", check)
    const observer = new ResizeObserver(check)
    observer.observe(el)

    return () => {
      el.removeEventListener("scroll", check)
      observer.disconnect()
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-card to-transparent sm:hidden" />
      )}
    </div>
  )
}
