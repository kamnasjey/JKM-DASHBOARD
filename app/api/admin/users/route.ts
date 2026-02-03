import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getPrisma, prismaAvailable } from "@/lib/db"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET - List all users
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  // Try Prisma first
  const prisma = getPrisma()
  if (prisma) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          provider: true,
          hasPaidAccess: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ ok: true, users, source: "prisma" })
    } catch (err) {
      console.error("[admin/users] Prisma error:", err)
    }
  }

  // Fallback to Firestore
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

// POST - Update user access
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
  const { userId, hasAccess } = body

  if (!userId) {
    return NextResponse.json({ ok: false, message: "userId required" }, { status: 400 })
  }

  // Update in both Prisma and Firestore
  const prisma = getPrisma()
  if (prisma) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { hasPaidAccess: Boolean(hasAccess) },
      })
    } catch (err) {
      console.error("[admin/users] Prisma update error:", err)
    }
  }

  // Always update Firestore (canonical)
  try {
    const db = getFirebaseAdminDb()
    await db.collection("users").doc(userId).set(
      { 
        hasPaidAccess: Boolean(hasAccess),
        has_paid_access: Boolean(hasAccess),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    )
  } catch (err) {
    console.error("[admin/users] Firestore update error:", err)
    return NextResponse.json({ ok: false, message: "Firestore update failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: hasAccess ? "Access granted" : "Access revoked" })
}

// DELETE - Delete user account
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

  let prismaDeleted = false
  let firestoreDeleted = false

  // Delete from Prisma
  const prisma = getPrisma()
  if (prisma) {
    try {
      // Check if user exists in Prisma
      const existingUser = await prisma.user.findUnique({ where: { id: userId } })
      if (existingUser) {
        // Delete related data first
        await prisma.account.deleteMany({ where: { userId } })
        await prisma.session.deleteMany({ where: { userId } })
        await prisma.user.delete({ where: { id: userId } })
        prismaDeleted = true
        console.log(`[admin/users] Prisma: User ${userId} deleted`)
      }
    } catch (err) {
      console.error("[admin/users] Prisma delete error:", err)
      // If Prisma fails but user exists, return error
      return NextResponse.json({ ok: false, message: "Prisma delete failed" }, { status: 500 })
    }
  }

  // Delete from Firestore
  try {
    const db = getFirebaseAdminDb()

    // Check if user exists in Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
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
      firestoreDeleted = true
      console.log(`[admin/users] Firestore: User ${userId} deleted`)
    }
  } catch (err) {
    console.error("[admin/users] Firestore delete error:", err)
    return NextResponse.json({ ok: false, message: "Firestore delete failed" }, { status: 500 })
  }

  if (!prismaDeleted && !firestoreDeleted) {
    return NextResponse.json({ ok: false, message: "User not found in any database" }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    message: "User deleted",
    deletedFrom: { prisma: prismaDeleted, firestore: firestoreDeleted }
  })
}
