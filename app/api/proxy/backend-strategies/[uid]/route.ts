/**
 * Proxy to Backend: GET /api/internal/user-data/strategies/{uid}
 * Returns user strategies + activeStrategyId + activeStrategyMap from Python backend
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

const BACKEND = process.env.INTERNAL_BACKEND_URL || "http://localhost:8000"
const API_KEY = process.env.INTERNAL_API_KEY || ""

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params
  
  // Security: only allow users to fetch their own data
  if (uid !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  if (!API_KEY) {
    console.error("[proxy/backend-strategies] Missing INTERNAL_API_KEY")
    return NextResponse.json({ ok: false, error: "Internal auth missing" }, { status: 500 })
  }

  try {
    const res = await fetch(`${BACKEND}/api/internal/user-data/strategies/${uid}`, {
      method: "GET",
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[proxy/backend-strategies] Backend error:", res.status, text)
      return NextResponse.json(
        { ok: false, error: `Backend error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/backend-strategies] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    )
  }
}
