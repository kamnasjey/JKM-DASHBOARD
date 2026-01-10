"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Language = "mn" | "en"

interface Translations {
  // Nav
  features: string
  howItWorks: string
  pricing: string
  login: string
  register: string
  logout: string
  dashboard: string

  // Auth
  welcomeBack: string
  createAccount: string
  loginDescription: string
  registerDescription: string
  continueWithGoogle: string
  continueWithPhone: string
  continueWithEmail: string
  orContinueWith: string
  phoneNumber: string
  email: string
  password: string
  confirmPassword: string
  name: string
  sendCode: string
  verifyCode: string
  enterCode: string
  codeSent: string
  alreadyHaveAccount: string
  dontHaveAccount: string
  termsNotice: string

  // Common
  loading: string
  error: string
  success: string
  back: string
  next: string
  submit: string
}

const translations: Record<Language, Translations> = {
  mn: {
    features: "Онцлог",
    howItWorks: "Яаж ажилладаг вэ?",
    pricing: "Үнэ",
    login: "Нэвтрэх",
    register: "Бүртгүүлэх",
    logout: "Гарах",
    dashboard: "Хяналтын самбар",
    welcomeBack: "Тавтай морил",
    createAccount: "Бүртгэл үүсгэх",
    loginDescription: "Өөрийн бүртгэлдээ нэвтэрнэ үү",
    registerDescription: "Шинэ бүртгэл үүсгэнэ үү",
    continueWithGoogle: "Google-ээр үргэлжлүүлэх",
    continueWithPhone: "Утасны дугаараар үргэлжлүүлэх",
    continueWithEmail: "И-мэйлээр үргэлжлүүлэх",
    orContinueWith: "Эсвэл",
    phoneNumber: "Утасны дугаар",
    email: "И-мэйл хаяг",
    password: "Нууц үг",
    confirmPassword: "Нууц үг баталгаажуулах",
    name: "Нэр",
    sendCode: "Код илгээх",
    verifyCode: "Код баталгаажуулах",
    enterCode: "Баталгаажуулах код оруулна уу",
    codeSent: "Код илгээгдлээ",
    alreadyHaveAccount: "Бүртгэлтэй юу?",
    dontHaveAccount: "Бүртгэлгүй юу?",
    termsNotice: "Үргэлжлүүлснээр үйлчилгээний нөхцөл болон нууцлалын бодлогыг хүлээн зөвшөөрч байна.",
    loading: "Уншиж байна...",
    error: "Алдаа гарлаа",
    success: "Амжилттай",
    back: "Буцах",
    next: "Үргэлжлүүлэх",
    submit: "Илгээх",
  },
  en: {
    features: "Features",
    howItWorks: "How it works",
    pricing: "Pricing",
    login: "Login",
    register: "Register",
    logout: "Logout",
    dashboard: "Dashboard",
    welcomeBack: "Welcome back",
    createAccount: "Create account",
    loginDescription: "Sign in to your account",
    registerDescription: "Create a new account",
    continueWithGoogle: "Continue with Google",
    continueWithPhone: "Continue with Phone",
    continueWithEmail: "Continue with Email",
    orContinueWith: "Or continue with",
    phoneNumber: "Phone number",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    name: "Name",
    sendCode: "Send code",
    verifyCode: "Verify code",
    enterCode: "Enter verification code",
    codeSent: "Code sent",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    termsNotice: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    loading: "Loading...",
    error: "Error occurred",
    success: "Success",
    back: "Back",
    next: "Continue",
    submit: "Submit",
  },
}

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("mn")

  useEffect(() => {
    const saved = localStorage.getItem("jkm_lang") as Language | null
    if (saved && (saved === "mn" || saved === "en")) {
      setLang(saved)
    }
  }, [])

  const handleSetLang = (newLang: Language) => {
    setLang(newLang)
    localStorage.setItem("jkm_lang", newLang)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-1">
      <button
        onClick={() => setLang("mn")}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          lang === "mn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        MN
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  )
}
