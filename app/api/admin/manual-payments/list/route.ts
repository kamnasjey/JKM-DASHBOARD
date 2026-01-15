import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getPrisma, prismaAvailable } from "@/lib/db"
import { json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return json(401, { ok: false, message: "Unauthorized" })

  const adminEmail = (session.user as any).email as string | undefined
  if (!isOwnerEmail(adminEmail)) return json(403, { ok: false, message: "Forbidden" })

  // Check if billing/Prisma is available
  if (!prismaAvailable()) {
    return json(503, { ok: false, message: "Billing disabled (no DATABASE_URL)", requests: [] })
  }

  const prisma = getPrisma()
  if (!prisma) {
    return json(503, { ok: false, message: "Database unavailable", requests: [] })
  }

  const requests = await prisma.user.findMany({
    where: { manualPaymentStatus: "pending" },
    orderBy: { manualPaymentRequestedAt: "desc" },
    select: {
      id: true,
      email: true,
      manualPaymentPlan: true,
      manualPaymentPayerEmail: true,
      manualPaymentTxnRef: true,
      manualPaymentNote: true,
      manualPaymentRequestedAt: true,
    },
  })

  return json(200, { ok: true, requests })
}
