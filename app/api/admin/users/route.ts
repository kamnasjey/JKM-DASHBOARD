import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET - List all users (from Firestore - canonical source)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  // Load from Firestore (canonical source)
  try {
    const db = getFirebaseAdminDb()
    const snapshot = await db.collection("users").limit(100).get()
    const users = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        image: data.image,
        provider: data.provider,
        plan: data.plan || "free",
        hasPaidAccess: data.hasPaidAccess || data.has_paid_access || false,
        createdAt: data.createdAt || null,
      }
    })
    return NextResponse.json({ ok: true, users, source: "firestore" })
  } catch (err) {
    console.error("[admin/users] Firestore error:", err)
    return NextResponse.json({ ok: false, message: "Database unavailable" }, { status: 503 })
  }
}

// POST - Update user access (Firestore only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, hasAccess, plan } = body

  if (!userId) {
    return NextResponse.json({ ok: false, message: "userId required" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()
    const now = new Date().toISOString()

    // When granting access, also set plan (default to "starter" if not specified)
    const updateData: Record<string, any> = {
      hasPaidAccess: Boolean(hasAccess),
      has_paid_access: Boolean(hasAccess),
      updatedAt: now,
    }

    if (hasAccess) {
      // Granting access - set plan to starter if currently free, or use specified plan
      const userDoc = await db.collection("users").doc(userId).get()
      const currentPlan = userDoc.data()?.plan || "free"

      if (currentPlan === "free" || plan) {
        updateData.plan = plan || "starter"
        updateData.planStatus = "active"
        updateData.paidAt = now
      }
    }

    await db.collection("users").doc(userId).set(updateData, { merge: true })
    return NextResponse.json({ ok: true, message: hasAccess ? "Access granted" : "Access revoked" })
  } catch (err) {
    console.error("[admin/users] Firestore update error:", err)
    return NextResponse.json({ ok: false, message: "Firestore update failed" }, { status: 500 })
  }
}

// DELETE - Delete user account (Firestore only)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ ok: false, message: "userId required" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()

    // Check if user exists
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 })
    }

    // Delete user's subcollections (all user data)
    const subcollections = [
      "signals",
      "strategies",
      "drawings",
      "scanner-state",
      "outcomes",
      "prefs",
      "notifications",
      "activity"
    ]

    for (const subcol of subcollections) {
      const subcolRef = db.collection("users").doc(userId).collection(subcol)
      const subcolDocs = await subcolRef.listDocuments()
      for (const doc of subcolDocs) {
        await doc.delete()
      }
    }

    // Delete user document
    await db.collection("users").doc(userId).delete()
    console.log(`[admin/users] User ${userId} deleted from Firestore`)

    return NextResponse.json({ ok: true, message: "User deleted" })
  } catch (err) {
    console.error("[admin/users] Delete error:", err)
    return NextResponse.json({ ok: false, message: "Failed to delete user" }, { status: 500 })
  }
}
