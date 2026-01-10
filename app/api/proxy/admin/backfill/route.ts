import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await requireSession()
  if (!session) {
    return json(401, { ok: false, message: "Unauthorized" })
  }

  return forwardInternalRequest(request, {
    method: "POST",
    path: "/api/admin/backfill",
  })
}
