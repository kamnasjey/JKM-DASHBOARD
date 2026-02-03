import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type DecideBody = {
  userId?: string
  userEmail?: string
  decision?: "approve" | "reject"
  plan?: string
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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = (session.user as any).email as string | undefined
  if (!isOwnerEmail(adminEmail)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as DecideBody | null
  const decision = body?.decision
  const userId = String(body?.userId ?? "").trim()
  const userEmail = normalizeEmail(body?.userEmail)
  const note = String(body?.note ?? "").trim()
  const plan = normalizePlan(body?.plan)

  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ ok: false, message: "decision must be approve|reject" }, { status: 400 })
  }

  if (!userId && !userEmail) {
    return NextResponse.json({ ok: false, message: "userId or userEmail required" }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const now = new Date().toISOString()

  try {
    let userDocId: string | null = null

    if (userId) {
      // Find by userId
      const doc = await db.collection("users").doc(userId).get()
      if (doc.exists) {
        userDocId = doc.id
      }
    } else if (userEmail) {
      // Find by email
      const snapshot = await db
        .collection("users")
        .where("email", "==", userEmail)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        userDocId = snapshot.docs[0].id
      }
    }

    if (!userDocId) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 })
    }

    const userDoc = await db.collection("users").doc(userDocId).get()
    const userData = userDoc.data() || {}

    if (decision === "approve") {
      await db.collection("users").doc(userDocId).set(
        {
          hasPaidAccess: true,
          has_paid_access: true,
          paidAt: now,
          manualPaymentStatus: "approved",
          manualPaymentPlan: plan ?? userData.manualPaymentPlan,
          manualPaymentReviewedAt: now,
          manualPaymentReviewedBy: adminEmail ?? null,
          manualPaymentNote: note || userData.manualPaymentNote || null,
        },
        { merge: true }
      )

      return NextResponse.json({ ok: true, status: "approved" })
    }

    // reject
    await db.collection("users").doc(userDocId).set(
      {
        manualPaymentStatus: "rejected",
        manualPaymentReviewedAt: now,
        manualPaymentReviewedBy: adminEmail ?? null,
        manualPaymentNote: note || userData.manualPaymentNote || null,
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, status: "rejected" })
  } catch (err) {
    console.error("[admin/manual-payments/decide] Error:", err)
    return NextResponse.json({ ok: false, message: "Failed to process decision" }, { status: 500 })
  }
}
