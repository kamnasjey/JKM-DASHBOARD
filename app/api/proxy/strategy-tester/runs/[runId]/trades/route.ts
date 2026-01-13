import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

// GET /api/proxy/strategy-tester/runs/[runId]/trades - Get trades for a run
export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const { runId } = await params

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/strategy-tester/runs/${runId}/trades`,
  })
}
