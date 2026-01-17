/**
 * GET /api/scanner/results
 * 
 * Proxies scanner results request to backend.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY

export async function GET(request: NextRequest) {
  // --- 1. Authentication ---
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Login required" },
      { status: 401 }
    )
  }

  // --- 2. Get limit from query params ---
  const url = new URL(request.url)
  const limit = url.searchParams.get("limit") || "100"

  // --- 3. Proxy to backend ---
  if (!INTERNAL_API_KEY) {
    return NextResponse.json({
      ok: true,
      count: 0,
      results: [],
      simVersion: "not-configured",
      dashboardVersion: getDashboardVersion(),
    })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_ORIGIN}/scan/results?limit=${limit}`, {
      method: "GET",
      headers: {
        "x-internal-api-key": INTERNAL_API_KEY,
      },
    })

    const result = await backendResponse.json()
    
    return NextResponse.json({
      ...result,
      dashboardVersion: getDashboardVersion(),
    }, { status: backendResponse.status })

  } catch (err: any) {
    console.error("[scanner/results] Backend error:", err?.message)
    return NextResponse.json({
      ok: true,
      count: 0,
      results: [],
      error: "BACKEND_UNREACHABLE",
      dashboardVersion: getDashboardVersion(),
    })
  }
}
