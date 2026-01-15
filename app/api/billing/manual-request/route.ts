import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getPrisma, prismaAvailable } from "@/lib/db"

export const runtime = "nodejs"

// Helper to check if billing is disabled
function isBillingDisabled(): boolean {
  return process.env.BILLING_DISABLED === "1" || !prismaAvailable()
}

type ManualRequestBody = {
  payerEmail?: string
  plan?: string
  txnRef?: string
  note?: string
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").toLowerCase().trim()
}

function normalizePlan(value: unknown): "pro" | "pro_plus" | null {
  const raw = String(value ?? "").toLowerCase().trim()
  if (!raw) return null
  if (raw === "pro") return "pro"
  if (raw === "pro+" || raw === "pro_plus" || raw === "pro plus" || raw === "plus") return "pro_plus"
  return null
}

export async function POST(request: Request) {
  // Check if billing is disabled
  if (isBillingDisabled()) {
    return NextResponse.json(
      { ok: false, message: "Billing disabled. Contact admin for access." },
      { status: 503 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const prisma = getPrisma()
  if (!prisma) {
    return NextResponse.json(
      { ok: false, message: "Database unavailable" },
      { status: 503 }
    )
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

  const sessionUserId = (session.user as any).id as string | undefined
  const sessionEmail = normalizeEmail((session.user as any).email)

  if (!sessionUserId && !sessionEmail) {
    return NextResponse.json({ ok: false, message: "User identity missing" }, { status: 400 })
  }

  const now = new Date()

  // Prefer ID when available, fallback to email-based lookup/upsert.
  if (sessionUserId) {
    await prisma.user.upsert({
      where: { id: sessionUserId },
      update: {
        manualPaymentStatus: "pending",
        manualPaymentPlan: plan,
        manualPaymentPayerEmail: payerEmail,
        manualPaymentTxnRef: txnRef || null,
        manualPaymentNote: note || null,
        manualPaymentRequestedAt: now,
        manualPaymentReviewedAt: null,
        manualPaymentReviewedBy: null,
      },
      create: {
        id: sessionUserId,
        email: sessionEmail || null,
        manualPaymentStatus: "pending",
        manualPaymentPlan: plan,
        manualPaymentPayerEmail: payerEmail,
        manualPaymentTxnRef: txnRef || null,
        manualPaymentNote: note || null,
        manualPaymentRequestedAt: now,
      },
    })

    return NextResponse.json({ ok: true, status: "pending" })
  }

  // Email fallback (e.g., OAuth session without DB id)
  await prisma.user.upsert({
    where: { email: sessionEmail },
    update: {
      manualPaymentStatus: "pending",
      manualPaymentPlan: plan,
      manualPaymentPayerEmail: payerEmail,
      manualPaymentTxnRef: txnRef || null,
      manualPaymentNote: note || null,
      manualPaymentRequestedAt: now,
      manualPaymentReviewedAt: null,
      manualPaymentReviewedBy: null,
    },
    create: {
      email: sessionEmail,
      manualPaymentStatus: "pending",
      manualPaymentPlan: plan,
      manualPaymentPayerEmail: payerEmail,
      manualPaymentTxnRef: txnRef || null,
      manualPaymentNote: note || null,
      manualPaymentRequestedAt: now,
    },
  })

  return NextResponse.json({ ok: true, status: "pending" })
}
