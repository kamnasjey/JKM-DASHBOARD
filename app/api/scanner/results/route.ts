/**
 * GET /api/scanner/results (PUBLIC)
 * 
 * Proxies scanner results request to backend.
 * NOTE: Public endpoint - no auth required (read-only results)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY

export async function GET(request: NextRequest) {
  // PUBLIC endpoint - no auth required (read-only)
  
  // --- Get limit from query params ---
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
