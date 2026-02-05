import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

type ManualRequestBody = {
  payerEmail?: string
  plan?: string
  txnRef?: string
  note?: string
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").toLowerCase().trim()
}

function normalizePlan(value: unknown): "starter" | "pro" | "pro_plus" | null {
  const raw = String(value ?? "").toLowerCase().trim()
  if (!raw) return null
  if (raw === "starter") return "starter"
  if (raw === "pro") return "pro"
  if (raw === "pro+" || raw === "pro_plus" || raw === "pro plus" || raw === "plus") return "pro_plus"
  return null
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as ManualRequestBody | null
  const payerEmail = normalizeEmail(body?.payerEmail)
  const plan = normalizePlan(body?.plan)
  const txnRef = String(body?.txnRef ?? "").trim()
  const note = String(body?.note ?? "").trim()

  if (!payerEmail || !payerEmail.includes("@")) {
    return NextResponse.json({ ok: false, message: "Payer email буруу байна" }, { status: 400 })
  }
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Plan сонгоно уу" }, { status: 400 })
  }

  const userId = (session.user as any).id as string | undefined
  const sessionEmail = normalizeEmail((session.user as any).email)

  if (!userId) {
    return NextResponse.json({ ok: false, message: "User identity missing" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const db = getFirebaseAdminDb()

  try {
    await db.collection("users").doc(userId).set(
      {
        email: sessionEmail || undefined,
        manualPaymentStatus: "pending",
        manualPaymentPlan: plan,
        manualPaymentPayerEmail: payerEmail,
        manualPaymentTxnRef: txnRef || null,
        manualPaymentNote: note || null,
        manualPaymentRequestedAt: now,
        manualPaymentReviewedAt: null,
        manualPaymentReviewedBy: null,
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, status: "pending" })
  } catch (err) {
    console.error("[billing/manual-request] Error:", err)
    return NextResponse.json({ ok: false, message: "Failed to submit request" }, { status: 500 })
  }
}
