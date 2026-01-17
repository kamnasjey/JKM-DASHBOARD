/**
 * POST /api/scanner/stop
 * 
 * Proxies scanner stop request to backend.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY

export async function POST(request: NextRequest) {
  // --- 1. Authentication ---
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Login required" },
      { status: 401 }
    )
  }
  
  const userEmail = (session.user as any).email as string
  
  // Only owner can use scanner
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN", message: "Scanner access restricted to owners" },
      { status: 403 }
    )
  }

  // --- 2. Proxy to backend ---
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "CONFIG_ERROR", message: "Backend not configured" },
      { status: 500 }
    )
  }

  try {
    const backendResponse = await fetch(`${BACKEND_ORIGIN}/scan/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
    })

    const result = await backendResponse.json()
    
    return NextResponse.json({
      ...result,
      dashboardVersion: getDashboardVersion(),
    }, { status: backendResponse.status })

  } catch (err: any) {
    console.error("[scanner/stop] Backend error:", err?.message)
    return NextResponse.json(
      { 
        ok: false, 
        error: "BACKEND_UNREACHABLE", 
        message: "Could not reach backend server",
        dashboardVersion: getDashboardVersion(),
      },
      { status: 502 }
    )
  }
}
