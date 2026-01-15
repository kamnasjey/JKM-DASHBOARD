import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getPrisma, prismaAvailable } from "@/lib/db"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Helper to check if billing is disabled
function isBillingDisabled(): boolean {
  return process.env.BILLING_DISABLED === "1"
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string | undefined
    const email = ((session.user as any).email as string | undefined)?.toLowerCase().trim()

    // If billing is disabled, return minimal status from Firestore
    if (isBillingDisabled() || !prismaAvailable()) {
      // Try to get basic access status from Firestore
      if (userId) {
        try {
          const db = getFirebaseAdminDb()
          const doc = await db.collection("users").doc(userId).get()
          const data = doc.data()
          return NextResponse.json({
            ok: true,
            hasPaidAccess: data?.hasPaidAccess === true || data?.has_paid_access === true,
            paidAt: data?.paidAt || null,
            manualPaymentStatus: "none",
            billingDisabled: true,
            source: "firestore"
          })
        } catch {
          // Firestore error
        }
      }
      return NextResponse.json({
        ok: true,
        hasPaidAccess: false,
        paidAt: null,
        manualPaymentStatus: "none",
        billingDisabled: true,
        source: "none"
      })
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({
        ok: true,
        hasPaidAccess: false,
        paidAt: null,
        manualPaymentStatus: "none",
        billingDisabled: true,
        error: "Database unavailable"
      })
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : email ? { email } : { id: "__missing__" },
      select: {
        hasPaidAccess: true,
        paidAt: true,
        manualPaymentStatus: true,
        manualPaymentPlan: true,
        manualPaymentPayerEmail: true,
        manualPaymentTxnRef: true,
        manualPaymentNote: true,
        manualPaymentRequestedAt: true,
        manualPaymentReviewedAt: true,
        manualPaymentReviewedBy: true,
      },
    })

    if (!user) {
      // User not in DB yet, default to unpaid
      return NextResponse.json({
        ok: true,
        hasPaidAccess: false,
        paidAt: null,
        manualPaymentStatus: "none",
        manualPaymentPlan: null,
        manualPaymentPayerEmail: null,
        manualPaymentTxnRef: null,
        manualPaymentNote: null,
        manualPaymentRequestedAt: null,
        manualPaymentReviewedAt: null,
        manualPaymentReviewedBy: null,
      })
    }

    return NextResponse.json({ ok: true, ...user })
  } catch (err: unknown) {
    console.error("[billing/status] Error:", err)
    // Return safe default instead of 500
    return NextResponse.json({
      ok: true,
      hasPaidAccess: false,
      paidAt: null,
      manualPaymentStatus: "none",
      manualPaymentPlan: null,
      manualPaymentPayerEmail: null,
      manualPaymentTxnRef: null,
      manualPaymentNote: null,
      manualPaymentRequestedAt: null,
      manualPaymentReviewedAt: null,
      manualPaymentReviewedBy: null,
      error: "DB unavailable",
    })
  }
}
