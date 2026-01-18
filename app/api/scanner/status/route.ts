/**
 * GET /api/scanner/status (PUBLIC)
 * 
 * Proxies scanner status request to backend.
 * NOTE: Public endpoint - no auth required (read-only status)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

export async function GET(request: NextRequest) {
  // PUBLIC endpoint - no auth required (read-only)
  
  // --- Proxy to backend ---
  if (!INTERNAL_API_KEY) {
    // Return mock status if backend not configured
    return NextResponse.json({
      ok: true,
      running: false,
      runId: null,
      counters: { cycles: 0, setupsFound: 0, errors: 0 },
      lastErrors: [],
      simVersion: "not-configured",
      dashboardVersion: getDashboardVersion(),
    })
  }

  try {
    const backendResponse = await fetch(`${BACKEND_ORIGIN}/scan/status`, {
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
    console.error("[scanner/status] Backend error:", err?.message)
    // Return default status on error
    return NextResponse.json({
      ok: true,
      running: false,
      error: "BACKEND_UNREACHABLE",
      message: "Could not reach backend server",
      counters: { cycles: 0, setupsFound: 0, errors: 0 },
      lastErrors: [],
      dashboardVersion: getDashboardVersion(),
    })
  }
}
