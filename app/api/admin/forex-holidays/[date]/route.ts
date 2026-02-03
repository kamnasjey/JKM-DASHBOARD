import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const HOLIDAYS_COLLECTION = "forex-holidays"

// DELETE - Remove a forex holiday by date
export async function DELETE(
  request: Request,
  { params }: { params: { date: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const { date } = params

  try {
    const db = getFirebaseAdminDb()
    const docRef = db.collection(HOLIDAYS_COLLECTION).doc(date)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ ok: false, message: "Holiday not found" }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ ok: true, message: "Holiday deleted" })
  } catch (err) {
    console.error("[forex-holidays] DELETE error:", err)
    return NextResponse.json({ ok: false, message: "Failed to delete holiday" }, { status: 500 })
  }
}
