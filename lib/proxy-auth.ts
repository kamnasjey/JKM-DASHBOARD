import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return null
  }
  return session
}

export async function requireAllowedSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const email = (session.user as any).email
  
  // Owner/admin always has access
  if (isOwnerEmail(email)) return session

  // Check Firestore for user access (canonical source)
  const userId = (session.user as any).id as string | undefined
  if (!userId) return null

  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    
    const data = userDoc.data()
    const hasAccess = data?.hasPaidAccess === true || data?.has_paid_access === true
    
    if (!hasAccess) return null
    return session
  } catch (err) {
    console.error("[proxy-auth] Firestore error:", err)
    // On Firestore error, deny access for safety
    return null
  }
}

// Legacy alias - now just checks allowed access instead of paid
export async function requirePaidSession() {
  return requireAllowedSession()
}

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}
