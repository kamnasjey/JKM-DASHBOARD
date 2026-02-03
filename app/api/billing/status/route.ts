import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string | undefined

    if (!userId) {
      return NextResponse.json({
        ok: true,
        hasPaidAccess: false,
        paidAt: null,
        manualPaymentStatus: "none",
      })
    }

    const db = getFirebaseAdminDb()
    const doc = await db.collection("users").doc(userId).get()

    if (!doc.exists) {
      return NextResponse.json({
        ok: true,
        hasPaidAccess: false,
        paidAt: null,
        manualPaymentStatus: "none",
      })
    }

    const data = doc.data() || {}

    return NextResponse.json({
      ok: true,
      hasPaidAccess: data.hasPaidAccess === true || data.has_paid_access === true,
      paidAt: data.paidAt || null,
      manualPaymentStatus: data.manualPaymentStatus || "none",
      manualPaymentPlan: data.manualPaymentPlan || null,
      manualPaymentPayerEmail: data.manualPaymentPayerEmail || null,
      manualPaymentTxnRef: data.manualPaymentTxnRef || null,
      manualPaymentNote: data.manualPaymentNote || null,
      manualPaymentRequestedAt: data.manualPaymentRequestedAt || null,
      manualPaymentReviewedAt: data.manualPaymentReviewedAt || null,
      manualPaymentReviewedBy: data.manualPaymentReviewedBy || null,
      source: "firestore",
    })
  } catch (err: unknown) {
    console.error("[billing/status] Error:", err)
    return NextResponse.json({
      ok: true,
      hasPaidAccess: false,
      paidAt: null,
      manualPaymentStatus: "none",
      error: "DB unavailable",
    })
  }
}
