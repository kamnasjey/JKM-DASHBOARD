import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string | undefined
    const email = ((session.user as any).email as string | undefined)?.toLowerCase().trim()

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
  } catch (err: any) {
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
