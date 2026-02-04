/**
 * POST /api/admin/scanner/control
 * Control scanner: start, stop, restart
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userEmail = (session.user as any).email as string

  // Only owner can control scanner
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "Backend not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const action = body.action as string

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 })
    }

    if (action === "restart") {
      // Stop then start
      await fetch(`${BACKEND_ORIGIN}/api/engine/stop`, {
        method: "POST",
        headers: { "x-internal-api-key": INTERNAL_API_KEY },
      })

      // Wait a moment
      await new Promise((r) => setTimeout(r, 1000))

      const startRes = await fetch(`${BACKEND_ORIGIN}/api/engine/start`, {
        method: "POST",
        headers: { "x-internal-api-key": INTERNAL_API_KEY },
      })

      const startData = await startRes.json().catch(() => ({}))
      return NextResponse.json({
        ok: startRes.ok,
        action: "restart",
        message: startRes.ok ? "Scanner restarted" : "Failed to restart",
        data: startData,
      })
    }

    // start or stop
    const endpoint = action === "start" ? "/api/engine/start" : "/api/engine/stop"
    const res = await fetch(`${BACKEND_ORIGIN}${endpoint}`, {
      method: "POST",
      headers: { "x-internal-api-key": INTERNAL_API_KEY },
    })

    const data = await res.json().catch(() => ({}))

    return NextResponse.json({
      ok: res.ok,
      action,
      message: res.ok ? `Scanner ${action}ed` : `Failed to ${action}`,
      data,
    })
  } catch (err: any) {
    console.error("[admin/scanner/control] Error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to control scanner" },
      { status: 500 }
    )
  }
}
