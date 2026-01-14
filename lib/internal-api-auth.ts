import { NextRequest } from "next/server"

export function requireInternalApiKey(request: NextRequest): { ok: true } | { ok: false; status: number; message: string } {
  const expected = process.env.DASHBOARD_INTERNAL_API_KEY
  if (!expected) {
    return { ok: false, status: 500, message: "Missing DASHBOARD_INTERNAL_API_KEY" }
  }

  const got = request.headers.get("x-internal-api-key") || request.headers.get("X-Internal-Api-Key")
  if (!got) {
    return { ok: false, status: 401, message: "Missing x-internal-api-key" }
  }

  if (got !== expected) {
    return { ok: false, status: 403, message: "Invalid internal API key" }
  }

  return { ok: true }
}
