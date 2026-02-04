import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

/**
 * POST /api/admin/simulator/clear-queue
 *
 * Clears the simulator job queue on the backend.
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

  // Only owner can clear queue
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
    // Call backend clear queue endpoint
    const res = await fetch(`${BACKEND_ORIGIN}/api/strategy-sim/clear-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
    })

    if (!res.ok) {
      // If endpoint doesn't exist, return graceful error
      if (res.status === 404) {
        return NextResponse.json({
          ok: true,
          message: "Queue endpoint not available. Queue may already be empty.",
        })
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
      message: data.message || "Simulator queue cleared",
      cleared: data.cleared ?? 0,
    })
  } catch (err: any) {
    console.error("[admin/simulator/clear-queue] Error:", err)
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to clear queue" },
      { status: 500 }
    )
  }
}
