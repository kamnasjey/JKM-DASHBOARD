import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

// GET /api/proxy/strategy-tester/runs - List all test runs
export async function GET(request: NextRequest) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") || "50"
  const offset = searchParams.get("offset") || "0"

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/strategy-tester/runs?limit=${limit}&offset=${offset}`,
  })
}
