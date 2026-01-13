import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  const { symbol } = await params
  const { searchParams } = new URL(request.url)
  const tf = searchParams.get("tf") || "M5"
  const limit = searchParams.get("limit") || "200"

  return forwardInternalRequest(request, {
    method: "GET",
    path: `/api/markets/${symbol}/candles?tf=${tf}&limit=${limit}`,
  })
}
