import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

// POST /api/proxy/strategy-tester/run - Run a strategy test
export async function POST(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  return forwardInternalRequest(request, {
    method: "POST",
    path: "/api/strategy-tester/run",
  })
}
