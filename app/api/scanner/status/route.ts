/**
 * GET /api/scanner/status
 * 
 * Proxies scanner status request to backend.
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

  // --- 2. Proxy to backend ---
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
