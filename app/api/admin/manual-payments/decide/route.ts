import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { prisma } from "@/lib/db"
import { json } from "@/lib/proxy-auth"

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
  if (!session?.user) return json(401, { ok: false, message: "Unauthorized" })

  const adminEmail = (session.user as any).email as string | undefined
  if (!isOwnerEmail(adminEmail)) return json(403, { ok: false, message: "Forbidden" })

  const body = (await request.json().catch(() => null)) as DecideBody | null
  const decision = body?.decision
  const userId = String(body?.userId ?? "").trim()
  const userEmail = normalizeEmail(body?.userEmail)
  const note = String(body?.note ?? "").trim()
  const plan = normalizePlan(body?.plan)

  if (decision !== "approve" && decision !== "reject") {
    return json(400, { ok: false, message: "decision must be approve|reject" })
  }

  if (!userId && !userEmail) {
    return json(400, { ok: false, message: "userId or userEmail required" })
  }

  const now = new Date()

  const where = userId ? { id: userId } : { email: userEmail }
  const existing = await prisma.user.findUnique({
    where,
    select: { id: true, hasPaidAccess: true, manualPaymentPlan: true },
  })

  if (!existing) {
    return json(404, { ok: false, message: "User not found" })
  }

  if (decision === "approve") {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        hasPaidAccess: true,
        paidAt: now,
        manualPaymentStatus: "approved",
        manualPaymentPlan: plan ?? existing.manualPaymentPlan,
        manualPaymentReviewedAt: now,
        manualPaymentReviewedBy: adminEmail ?? null,
        manualPaymentNote: note || undefined,
      },
    })

    return json(200, { ok: true, status: "approved" })
  }

  // reject
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      manualPaymentStatus: "rejected",
      manualPaymentReviewedAt: now,
      manualPaymentReviewedBy: adminEmail ?? null,
      manualPaymentNote: note || undefined,
    },
  })

  return json(200, { ok: true, status: "rejected" })
}
