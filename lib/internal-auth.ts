/**
 * Internal API authentication helper
 * Used for Backend <-> Dashboard communication
 */

import { NextRequest, NextResponse } from "next/server"

export function requireInternalKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-internal-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY

  if (!expectedKey) {
    console.error("[internal-auth] INTERNAL_API_KEY not configured")
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    )
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  return null // Auth passed
}

export function json(status: number, data: Record<string, unknown>): NextResponse {
  return NextResponse.json(data, { status })
}
