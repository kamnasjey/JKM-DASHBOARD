import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requirePaidSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requirePaidSession()
  if (!paid) return json(402, { ok: false, message: "Payment required" })

  const { search } = new URL(request.url)
  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/annotations${search}`,
  })
}
