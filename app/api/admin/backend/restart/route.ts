import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

/**
 * POST /api/admin/backend/restart
 *
 * Triggers a graceful restart of the backend API server.
 * Only accessible by owner/admin.
 */
export async function POST() {
  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  const userEmail = (session.user as any).email as string

  // Only owner can restart backend
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json(
      { ok: false, message: "Admin access required" },
      { status: 403 }
    )
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "Backend not configured" },
      { status: 500 }
    )
  }

  try {
    // Call backend restart endpoint
    const res = await fetch(`${BACKEND_ORIGIN}/admin/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify({ reason: "Manual restart from dashboard" }),
    })

    if (!res.ok) {
      // If endpoint doesn't exist, try alternative approach
      if (res.status === 404) {
        // Try graceful shutdown endpoint
        const shutdownRes = await fetch(`${BACKEND_ORIGIN}/admin/shutdown`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": INTERNAL_API_KEY,
          },
        })

        if (shutdownRes.ok) {
          return NextResponse.json({
            ok: true,
            message: "Backend shutdown initiated. Process manager will restart it.",
          })
        }
      }

      const text = await res.text()
      return NextResponse.json(
        { ok: false, message: `Backend returned ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json().catch(() => ({}))

    return NextResponse.json({
      ok: true,
      message: data.message || "Backend restart initiated",
    })
  } catch (err: any) {
    console.error("[admin/backend/restart] Error:", err)
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to restart backend" },
      { status: 500 }
    )
  }
}
