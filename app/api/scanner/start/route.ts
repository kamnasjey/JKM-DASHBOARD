/**
 * POST /api/scanner/start
 * 
 * Proxies scanner start request to backend.
 * 
 * IMPORTANT: Backend V2 uses strategyId as single source of truth.
 * It fetches detectors directly from Firestore, so we do NOT send
 * detectors from the frontend. This ensures:
 *   - Strategy edits are reflected immediately
 *   - No stale detector lists
 *   - Backend controls normalization
 * 
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { getDashboardVersion } from "@/lib/version"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

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
  const userId = (session.user as any).id as string | undefined
  
  // Only owner can use scanner
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN", message: "Scanner access restricted to owners" },
      { status: 403 }
    )
  }

  // --- 2. Parse request ---
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "Invalid request body" },
      { status: 400 }
    )
  }

  // --- 3. Validate required fields ---
  // V2: Only strategyId required, backend fetches detectors
  if (!body.strategyId || !body.symbols || !Array.isArray(body.symbols)) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "strategyId and symbols[] required" },
      { status: 422 }
    )
  }

  // --- 4. Proxy to backend (V2: no detectors sent) ---
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "CONFIG_ERROR", message: "Backend not configured" },
      { status: 500 }
    )
  }

  try {
    // V2 payload - strategyId is the single source of truth
    // Backend will fetch detectors via internal API
    const backendPayload = {
      strategyId: body.strategyId,
      strategyName: body.strategyName,
      userId: userId, // Include userId if available for faster lookup
      symbols: body.symbols,
      timeframes: body.timeframes || ["15m", "1h", "4h"],
      lookbackDays: body.lookbackDays || 30,
      intervalSec: body.intervalSec || 120,
      // Risk settings (optional overrides)
      minRR: body.minRR,
      minConfirmHits: body.minConfirmHits,
      requireGate: body.requireGate,
      requireTrigger: body.requireTrigger,
    }

    const backendResponse = await fetch(`${BACKEND_ORIGIN}/scan/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(backendPayload),
    })

    const result = await backendResponse.json()
    
    return NextResponse.json({
      ...result,
      dashboardVersion: getDashboardVersion(),
    }, { status: backendResponse.status })

  } catch (err: any) {
    console.error("[scanner/start] Backend error:", err?.message)
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
