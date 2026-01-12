import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requirePaidSession, requireSession, json } from "@/lib/proxy-auth"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requirePaidSession()
  if (!paid) return json(402, { ok: false, message: "Payment required" })

  const { id } = await params

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/signals/${id}`,
  })
}
