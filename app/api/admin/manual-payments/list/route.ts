import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { prisma } from "@/lib/db"
import { json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return json(401, { ok: false, message: "Unauthorized" })

  const adminEmail = (session.user as any).email as string | undefined
  if (!isOwnerEmail(adminEmail)) return json(403, { ok: false, message: "Forbidden" })

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
