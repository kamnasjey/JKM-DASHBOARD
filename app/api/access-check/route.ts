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

  // All authenticated users can access dashboard (free plan)
  // Plan-based restrictions are handled by AccessGate component per feature
  return NextResponse.json({
    ok: true,
    hasAccess: true,
    email,
    reason: "authenticated",
    source: "open_access"
  })
}
