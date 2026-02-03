"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Language = "en" | "mn"

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (en: string, mn: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en")

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("jkm-lang") as Language | null
    if (saved === "en" || saved === "mn") {
      setLangState(saved)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem("jkm-lang", newLang)
  }

  const t = (en: string, mn: string) => (lang === "en" ? en : mn)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Return default values if not wrapped in provider (for gradual adoption)
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (en: string, _mn: string) => en,
    }
  }
  return context
}
