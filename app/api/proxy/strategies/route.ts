import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/user/${userId}/strategies`,
  })
}

export async function PUT(request: Request) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const userId = (session.user as any)?.id
  if (!userId) return json(400, { ok: false, message: "User ID not found" })

  // Backend expects POST, but frontend uses PUT for update semantics
  return forwardInternalRequest(request, {
    method: "POST",
    path: `/api/user/${userId}/strategies`,
  })
}

