/**
 * GET /api/admin/scanner/status
 * Proxy to backend scanner status endpoint
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

export async function GET() {
  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userEmail = (session.user as any).email as string

  // Only owner can view scanner status
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "Backend not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/engine/status`, {
      method: "GET",
      headers: {
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Backend returned ${res.status}`, reachable: true },
        { status: 502 }
      )
    }

    const data = await res.json()

    // Calculate time since last scan
    const now = Math.floor(Date.now() / 1000)
    const lastScanTs = data.last_scan_ts || 0
    const secsSinceLastScan = lastScanTs > 0 ? now - lastScanTs : null

    // Determine health status
    const cadenceSec = data.cadence_sec || 300
    const healthyThreshold = cadenceSec * 2 // Allow 2x cadence before warning
    const criticalThreshold = cadenceSec * 4 // 4x cadence is critical

    let health: "healthy" | "warning" | "critical" | "unknown" = "unknown"
    if (data.running && secsSinceLastScan !== null) {
      if (secsSinceLastScan < healthyThreshold) {
        health = "healthy"
      } else if (secsSinceLastScan < criticalThreshold) {
        health = "warning"
      } else {
        health = "critical"
      }
    } else if (!data.running) {
      health = "critical"
    }

    return NextResponse.json({
      ok: true,
      reachable: true,
      running: data.running,
      lastScanTs: lastScanTs,
      lastScanId: data.last_scan_id,
      cadenceSec: cadenceSec,
      lastError: data.last_error,
      secsSinceLastScan,
      health,
      checkedAt: now,
    })
  } catch (err: any) {
    console.error("[admin/scanner/status] Error:", err)
    return NextResponse.json({
      ok: false,
      error: err.message || "Failed to reach backend",
      reachable: false,
      health: "critical",
      checkedAt: Math.floor(Date.now() / 1000),
    })
  }
}
