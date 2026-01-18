/**
 * Proxy to Backend: GET /api/internal/engine/strategy-map-status/{uid}
 * Returns 24/7 scanner status with per-symbol strategy info
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

const BACKEND =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.BACKEND_ORIGIN ||
  "https://api.jkmcopilot.com"
const API_KEY = process.env.INTERNAL_API_KEY || ""

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = (await getServerSession(authOptions)) as any
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params
  
  // Security: only allow users to fetch their own data
  if (uid !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  if (!API_KEY) {
    console.error("[proxy/engine-status] Missing INTERNAL_API_KEY")
    return NextResponse.json({ ok: false, error: "Internal auth missing" }, { status: 500 })
  }

  try {
    const res = await fetch(`${BACKEND}/api/internal/engine/strategy-map-status/${uid}`, {
      method: "GET",
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[proxy/engine-status] Backend error:", res.status, text)
      return NextResponse.json(
        { ok: false, error: `Backend error: ${res.status}`, engineRunning: false },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/engine-status] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable", engineRunning: false },
      { status: 502 }
    )
  }
}
