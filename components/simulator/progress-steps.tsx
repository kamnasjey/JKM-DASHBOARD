export const SIMULATOR_STEPS = [
  { id: "validate", label: "Стратеги шалгаж байна...", icon: "CheckCircle", duration: 500 },
  { id: "load_data", label: "Түүхэн дата ачаалж байна...", icon: "Database", duration: 1500 },
  { id: "integrity", label: "Дата бүрэн эсэхийг шалгаж байна...", icon: "Shield", duration: 800 },
  { id: "detect", label: "Detector-ууд ажиллаж байна...", icon: "Search", duration: 2000 },
  { id: "simulate", label: "Симуляци хийж байна...", icon: "TrendingUp", duration: 1500 },
  { id: "complete", label: "Бэлэн болж байна...", icon: "Sparkles", duration: 500 },
] as const

export type SimulatorStep = typeof SIMULATOR_STEPS[number]["id"]
