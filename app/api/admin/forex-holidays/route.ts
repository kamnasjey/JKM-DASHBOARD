import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const HOLIDAYS_COLLECTION = "forex-holidays"

// GET - List all forex holidays
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  try {
    const db = getFirebaseAdminDb()
    const snapshot = await db.collection(HOLIDAYS_COLLECTION).orderBy("date", "asc").get()
    const holidays = snapshot.docs.map(doc => ({
      date: doc.id,
      name: doc.data().name,
      added_by: doc.data().added_by,
      added_at: doc.data().added_at,
    }))
    return NextResponse.json({ ok: true, holidays })
  } catch (err) {
    console.error("[forex-holidays] GET error:", err)
    return NextResponse.json({ ok: false, message: "Failed to load holidays" }, { status: 500 })
  }
}

// POST - Add a new forex holiday
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { date, name } = body

    if (!date || !name) {
      return NextResponse.json({ ok: false, message: "date and name required" }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    await db.collection(HOLIDAYS_COLLECTION).doc(date).set({
      name,
      date,
      added_by: email,
      added_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, message: "Holiday added" })
  } catch (err) {
    console.error("[forex-holidays] POST error:", err)
    return NextResponse.json({ ok: false, message: "Failed to add holiday" }, { status: 500 })
  }
}
