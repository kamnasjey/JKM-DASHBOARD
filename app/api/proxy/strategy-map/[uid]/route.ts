/**
 * Proxy to Backend: POST /api/internal/user-data/active-strategy-map/{uid}
 * Sets per-symbol strategy mapping
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = (await getServerSession(authOptions)) as any
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params
  
  // Security: only allow users to update their own data
  if (uid !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  if (!API_KEY) {
    console.error("[proxy/strategy-map] Missing INTERNAL_API_KEY")
    return NextResponse.json({ ok: false, error: "Internal auth missing" }, { status: 500 })
  }

  try {
    const body = await request.json()

    const res = await fetch(`${BACKEND}/api/internal/user-data/active-strategy-map/${uid}`, {
      method: "POST",
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[proxy/strategy-map] Backend error:", res.status, text)
      return NextResponse.json(
        { ok: false, error: `Backend error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/strategy-map] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    )
  }
}
