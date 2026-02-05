import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { isOwnerEmail } from "@/lib/owner"

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
        plan: "starter",
        planStatus: "active",
        hasPaidAccess: false,
      })
    }

    const userData = userDoc.data()

    return NextResponse.json({
      plan: userData?.plan || "starter",
      planStatus: userData?.planStatus || "active",
      hasPaidAccess: userData?.hasPaidAccess || userData?.has_paid_access || false,
    })
  } catch (error) {
    console.error("[API] Get user plan error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
