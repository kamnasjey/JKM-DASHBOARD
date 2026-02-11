"use client"

import { createContext, useContext, useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { getTourSteps } from "./tour-steps"
import { useLanguage } from "@/contexts/language-context"

interface TourContextType {
  startTour: () => void
}

const TourContext = createContext<TourContextType>({ startTour: () => {} })

export function useTour() {
  return useContext(TourContext)
}

function getPageKey(pathname: string): string {
  if (pathname === "/dashboard") return "dashboard"
  if (pathname === "/strategies") return "strategies"
  if (pathname === "/profile") return "profile"
  return ""
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const hasAutoStarted = useRef(false)

  const startTour = useCallback(() => {
    const pageKey = getPageKey(pathname)
    if (!pageKey) return

    const steps = getTourSteps(pageKey, lang as "mn" | "en")
    if (steps.length === 0) return

    const validSteps = steps.filter(
      (s) => !s.element || document.querySelector(s.element as string)
    )
    if (validSteps.length === 0) return

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.7)",
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "jkm-tour-popover",
      nextBtnText: lang === "mn" ? "Дараах" : "Next",
      prevBtnText: lang === "mn" ? "Өмнөх" : "Previous",
      doneBtnText: lang === "mn" ? "Дуусгах" : "Done",
      onDestroyed: () => {
        localStorage.setItem(`jkm-tour-done-${pageKey}`, "1")
      },
      steps: validSteps,
    })

    d.drive()
  }, [pathname, lang])

  useEffect(() => {
    const pageKey = getPageKey(pathname)
    if (!pageKey) return
    if (hasAutoStarted.current) return

    const done = localStorage.getItem(`jkm-tour-done-${pageKey}`)
    if (done) return

    hasAutoStarted.current = true
    const timer = setTimeout(() => {
      startTour()
    }, 2000)

    return () => clearTimeout(timer)
  }, [pathname, startTour])

  useEffect(() => {
    hasAutoStarted.current = false
  }, [pathname])

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  )
}
