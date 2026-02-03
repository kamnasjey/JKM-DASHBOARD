import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Нэвтрээгүй байна" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const sessionEmail = (session.user as any).email

    // Get user from Firestore
    if (userId) {
      try {
        const db = getFirebaseAdminDb()
        const doc = await db.collection("users").doc(userId).get()
        if (doc.exists) {
          const data = doc.data()
          return NextResponse.json({
            user: {
              id: userId,
              email: data?.email || sessionEmail,
              phone: data?.phone || null,
              name: data?.name || session.user.name,
              image: data?.image || session.user.image,
              provider: data?.provider || "google",
              createdAt: data?.createdAt || null,
            },
            source: "firestore",
          })
        }
      } catch (err) {
        console.error("[API] /api/me Firestore error:", err)
      }
    }

    // Return session data as fallback
    return NextResponse.json({
      user: {
        id: userId || "unknown",
        email: sessionEmail,
        name: session.user.name,
        image: session.user.image,
        provider: "session",
      },
      source: "session",
    })
  } catch (error) {
    console.error("[API] /api/me error:", error)
    return NextResponse.json(
      { error: "Алдаа гарлаа" },
      { status: 500 }
    )
  }
}
