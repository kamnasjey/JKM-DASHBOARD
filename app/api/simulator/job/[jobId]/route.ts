/**
 * GET /api/simulator/job/[jobId]
 *
 * Get simulation job status and progress
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export const runtime = "nodejs"

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Authentication
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = params

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Job ID required" }, { status: 400 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "Backend not configured" }, { status: 500 })
  }

  try {
    const backendUrl = `${BACKEND_ORIGIN}/api/strategy-sim/jobs/${jobId}`
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "x-internal-api-key": INTERNAL_API_KEY,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
      }
      return NextResponse.json({ ok: false, error: "Backend error" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[simulator/job] Error:", error)
    return NextResponse.json({ ok: false, error: "Failed to get job status" }, { status: 500 })
  }
}
