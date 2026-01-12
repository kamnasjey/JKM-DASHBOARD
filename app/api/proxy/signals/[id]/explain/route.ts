import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requirePaidSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requirePaidSession()
  if (!paid) return json(402, { ok: false, message: "Payment required" })

  const { id } = await params

  return forwardInternalRequest(request, {
    method: "POST",
    path: `/api/signals/${id}/explain`,
  })
}
