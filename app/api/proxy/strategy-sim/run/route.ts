import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id

  // Get request body and add user_id
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return json(400, { ok: false, message: "Invalid JSON body" })
  }

  // Add user_id to request
  body.user_id = userId

  return forwardInternalRequest(request, {
    method: "POST",
    path: "/api/strategy-sim/run",
    body: JSON.stringify(body),
  })
}
