import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const { search } = new URL(request.url)
  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/signals${search}`,
  })
}
