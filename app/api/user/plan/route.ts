import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { isOwnerEmail } from "@/lib/owner"
import { isTrialExpired, getTrialDaysRemaining } from "@/lib/trial"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const email = (session.user as any)?.email

    // Owner/admin always has unlimited access (pro_plus)
    if (isOwnerEmail(email)) {
      return NextResponse.json({
        plan: "pro_plus",
        planStatus: "active",
        hasPaidAccess: true,
        isOwner: true,
      })
    }

    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      // User not found in Firestore, default to starter plan
      return NextResponse.json({
        plan: "free",
        planStatus: "active",
        hasPaidAccess: false,
      })
    }

    const userData = userDoc.data()

    // Check if trial user and if trial has expired
    if (userData?.is_trial && isTrialExpired(userData?.trial_end)) {
      // Auto-downgrade to free
      await db.collection("users").doc(userId).set(
        {
          plan: "free",
          planStatus: "active",
          hasPaidAccess: false,
          has_paid_access: false,
          trial_expired: true,
        },
        { merge: true }
      )
      return NextResponse.json({
        plan: "free",
        planStatus: "active",
        hasPaidAccess: false,
        is_trial: true,
        trial_expired: true,
        trial_days_remaining: 0,
      })
    }

    // Trial still active - include trial info
    const isTrial = userData?.is_trial === true
    const trialDays = isTrial ? getTrialDaysRemaining(userData?.trial_end) : undefined

    return NextResponse.json({
      plan: userData?.plan || "starter",
      planStatus: userData?.planStatus || "active",
      hasPaidAccess: userData?.hasPaidAccess || userData?.has_paid_access || false,
      ...(isTrial && {
        is_trial: true,
        trial_end: userData?.trial_end,
        trial_days_remaining: trialDays,
      }),
    })
  } catch (error) {
    console.error("[API] Get user plan error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
