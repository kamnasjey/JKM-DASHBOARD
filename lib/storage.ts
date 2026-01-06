// Client-side storage utilities
const RISK_KEY = "jkm_risk_v1"
const JOURNEY_KEY = "jkm_journey_v1"

export function getRiskSettings() {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(RISK_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setRiskSettings(settings: any) {
  if (typeof window === "undefined") return
  localStorage.setItem(RISK_KEY, JSON.stringify(settings))
}

export function getJourneyProgress() {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(JOURNEY_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setJourneyProgress(progress: any) {
  if (typeof window === "undefined") return
  localStorage.setItem(JOURNEY_KEY, JSON.stringify(progress))
}
