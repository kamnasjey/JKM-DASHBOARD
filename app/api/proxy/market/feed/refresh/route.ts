import { forwardInternalRequest } from "@/lib/backend-proxy"
import { requireAllowedSession, requireSession, json } from "@/lib/proxy-auth"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session) return json(401, { ok: false, message: "Unauthorized" })

  const paid = await requireAllowedSession()
  if (!paid) return json(403, { ok: false, message: "Access denied" })

  // Forward query params
  const symbol = request.nextUrl.searchParams.get("symbol") || ""
  const tf = request.nextUrl.searchParams.get("tf") || ""
  
  const queryParts: string[] = []
  if (symbol) queryParts.push(`symbol=${encodeURIComponent(symbol)}`)
  if (tf) queryParts.push(`tf=${encodeURIComponent(tf)}`)
  const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : ""

  return forwardInternalRequest(request, {
    method: "POST",
    path: `/api/market/feed/refresh${query}`,
  })
}
