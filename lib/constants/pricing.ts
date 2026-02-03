export type PlanType = "free" | "pro" | "pro_plus"

export interface PlanFeature {
  text: string
  included: boolean
}

export interface Plan {
  id: PlanType
  name: string
  nameMn: string
  price: number // MNT
  priceDisplay: string
  period: string
  description: string
  badge?: string
  features: PlanFeature[]
  limits: {
    maxStrategyCombinations: number
    simulatorPerDay: number
  }
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    nameMn: "Үнэгүй",
    price: 0,
    priceDisplay: "Үнэгүй",
    period: "",
    description: "Судлах, туршилт",
    features: [
      { text: "Signals харах", included: true },
      { text: "Documentation", included: true },
      { text: "Scanner ажиллуулах", included: false },
      { text: "Simulator ажиллуулах", included: false },
      { text: "Strategy үүсгэх", included: false },
      { text: "Telegram alert", included: false },
    ],
    limits: {
      maxStrategyCombinations: 0,
      simulatorPerDay: 0,
    },
  },
  {
    id: "pro",
    name: "Pro",
    nameMn: "Про",
    price: 120000,
    priceDisplay: "₮120,000",
    period: "/сар",
    description: "Идэвхтэй трейдерүүдэд",
    badge: "Түгээмэл",
    popular: true,
    features: [
      { text: "Dashboard бүрэн эрх", included: true },
      { text: "5 strategy хослол", included: true },
      { text: "Simulator 5 удаа/өдөр", included: true },
      { text: "Scanner ажиллуулах", included: true },
      { text: "Symbol сонголт", included: true },
      { text: "Telegram alert", included: true },
      { text: "Шинэ feature түрүүлж", included: false },
      { text: "Priority support", included: false },
    ],
    limits: {
      maxStrategyCombinations: 5,
      simulatorPerDay: 5,
    },
  },
  {
    id: "pro_plus",
    name: "Pro+",
    nameMn: "Про+",
    price: 200000,
    priceDisplay: "₮200,000",
    period: "/сар",
    description: "Бүрэн эрхтэй хандалт",
    badge: "Бүрэн",
    features: [
      { text: "Dashboard бүрэн эрх", included: true },
      { text: "15 strategy хослол (бүгд)", included: true },
      { text: "Simulator 15 удаа/өдөр", included: true },
      { text: "Scanner ажиллуулах", included: true },
      { text: "Symbol сонголт", included: true },
      { text: "Telegram alert", included: true },
      { text: "Шинэ feature түрүүлж авах", included: true },
      { text: "Priority support", included: true },
    ],
    limits: {
      maxStrategyCombinations: 15,
      simulatorPerDay: 15,
    },
  },
]

export const BANK_INFO = {
  bankName: "Хаан банк",
  accountNumber: "5819312017",
  accountHolder: "Ганбаяр Ганбат",
  iban: "MN38000500",
}

export function getPlanById(id: PlanType): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function getPlanLimits(plan: PlanType) {
  const p = getPlanById(plan)
  return p?.limits || { maxStrategyCombinations: 0, simulatorPerDay: 0 }
}
