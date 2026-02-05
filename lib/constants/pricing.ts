export type PlanType = "free" | "starter" | "pro" | "pro_plus"

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
    maxSymbols?: number
  }
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    nameMn: "Үнэгүй",
    price: 0,
    priceDisplay: "₮0",
    period: "",
    description: "Бүртгүүлээд үзэх",
    features: [
      { text: "Dashboard харах", included: true },
      { text: "Strategy хослол", included: false },
      { text: "Simulator", included: false },
      { text: "Symbol scan", included: false },
      { text: "Telegram alert", included: false },
    ],
    limits: {
      maxStrategyCombinations: 0,
      simulatorPerDay: 0,
      maxSymbols: 0,
    },
  },
  {
    id: "starter",
    name: "Starter",
    nameMn: "Стартер",
    price: 49000,
    priceDisplay: "₮49,000",
    period: "/сар",
    description: "Эхлэгч трейдерүүдэд",
    features: [
      { text: "Dashboard бүрэн хандалт", included: true },
      { text: "3 strategy хослол", included: true },
      { text: "Simulator 7 удаа/өдөр", included: true },
      { text: "3 symbol scan", included: true },
      { text: "Telegram alert", included: true },
    ],
    limits: {
      maxStrategyCombinations: 3,
      simulatorPerDay: 7,
      maxSymbols: 3,
    },
  },
  {
    id: "pro",
    name: "Pro",
    nameMn: "Про",
    price: 99000,
    priceDisplay: "₮99,000",
    period: "/сар",
    description: "Идэвхтэй трейдерүүдэд",
    badge: "Түгээмэл",
    popular: true,
    features: [
      { text: "Dashboard бүрэн эрх", included: true },
      { text: "6 strategy хослол", included: true },
      { text: "Simulator 18 удаа/өдөр", included: true },
      { text: "6 symbol scan", included: true },
      { text: "Telegram alert", included: true },
    ],
    limits: {
      maxStrategyCombinations: 6,
      simulatorPerDay: 18,
      maxSymbols: 6,
    },
  },
  {
    id: "pro_plus",
    name: "Pro+",
    nameMn: "Про+",
    price: 149000,
    priceDisplay: "₮149,000",
    period: "/сар",
    description: "Бүрэн эрхтэй хандалт",
    badge: "Бүрэн",
    features: [
      { text: "Dashboard бүрэн эрх", included: true },
      { text: "15 strategy хослол", included: true },
      { text: "Simulator хязгааргүй", included: true },
      { text: "15 symbol scan", included: true },
      { text: "Telegram alert", included: true },
      { text: "Шинэ feature түрүүлж авах", included: true },
    ],
    limits: {
      maxStrategyCombinations: 15,
      simulatorPerDay: -1, // -1 = unlimited
      maxSymbols: 15,
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
