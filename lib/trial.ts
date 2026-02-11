import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { TRIAL_CONFIG } from "@/lib/constants/pricing"

/**
 * Check if trial slots are available (< 100 trial users)
 */
export async function isTrialAvailable(): Promise<boolean> {
  const db = getFirebaseAdminDb()
  const snapshot = await db
    .collection("users")
    .where("is_trial", "==", true)
    .count()
    .get()

  const count = snapshot.data().count
  return count < TRIAL_CONFIG.maxUsers
}

/**
 * Get trial Firestore fields for a new user
 */
export function getTrialFields() {
  const now = new Date()
  const endDate = new Date(now.getTime() + TRIAL_CONFIG.days * 24 * 60 * 60 * 1000)

  return {
    is_trial: true,
    trial_plan: TRIAL_CONFIG.plan,
    trial_start: now.toISOString(),
    trial_end: endDate.toISOString(),
    plan: TRIAL_CONFIG.plan,
    planStatus: "active",
    hasPaidAccess: true,
    has_paid_access: true,
  }
}

/**
 * Check if a user's trial has expired
 */
export function isTrialExpired(trialEnd: string | null | undefined): boolean {
  if (!trialEnd) return false
  return new Date() > new Date(trialEnd)
}

/**
 * Get remaining trial days
 */
export function getTrialDaysRemaining(trialEnd: string | null | undefined): number {
  if (!trialEnd) return 0
  const remaining = new Date(trialEnd).getTime() - Date.now()
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}
