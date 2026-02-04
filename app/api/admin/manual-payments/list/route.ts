import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = (session.user as any).email as string | undefined
  if (!isOwnerEmail(adminEmail)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }

  try {
    const db = getFirebaseAdminDb()
    // Query without orderBy to avoid composite index requirement
    const snapshot = await db
      .collection("users")
      .where("manualPaymentStatus", "==", "pending")
      .get()

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email || null,
        name: data.name || null,
        manualPaymentPlan: data.manualPaymentPlan || null,
        manualPaymentPayerEmail: data.manualPaymentPayerEmail || null,
        manualPaymentTxnRef: data.manualPaymentTxnRef || null,
        manualPaymentNote: data.manualPaymentNote || null,
        manualPaymentRequestedAt: data.manualPaymentRequestedAt || null,
      }
    })

    // Sort by requested date (newest first) in JavaScript
    requests.sort((a, b) => {
      const dateA = a.manualPaymentRequestedAt ? new Date(a.manualPaymentRequestedAt).getTime() : 0
      const dateB = b.manualPaymentRequestedAt ? new Date(b.manualPaymentRequestedAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({ ok: true, requests })
  } catch (err) {
    console.error("[admin/manual-payments/list] Error:", err)
    return NextResponse.json({ ok: false, message: "Failed to load requests", requests: [] }, { status: 500 })
  }
}
