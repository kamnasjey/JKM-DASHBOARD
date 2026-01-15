import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ 
      ok: false, 
      hasAccess: false,
      reason: "not_authenticated" 
    })
  }

  const email = (session.user as any).email
  const userId = (session.user as any).id as string | undefined

  // Owner/admin always has access
  if (isOwnerEmail(email)) {
    return NextResponse.json({
      ok: true,
      hasAccess: true,
      email,
      reason: "owner"
    })
  }

  // Check Firestore for user access (canonical source)
  if (!userId) {
    return NextResponse.json({
      ok: true,
      hasAccess: false,
      email,
      reason: "no_user_id"
    })
  }

  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    
    // Check hasPaidAccess or has_paid_access field
    const data = userDoc.data()
    const hasAccess = data?.hasPaidAccess === true || data?.has_paid_access === true

    return NextResponse.json({
      ok: true,
      hasAccess,
      email,
      reason: hasAccess ? "approved" : "pending_approval",
      source: "firestore"
    })
  } catch (err) {
    console.error("[access-check] Firestore error:", err)
    return NextResponse.json({
      ok: true,
      hasAccess: false,
      email,
      reason: "firestore_error",
      error: err instanceof Error ? err.message : String(err)
    })
  }
}
