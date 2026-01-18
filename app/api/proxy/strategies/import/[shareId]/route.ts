import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

const BACKEND =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.BACKEND_ORIGIN ||
  "https://api.jkmcopilot.com"
const API_KEY = process.env.INTERNAL_API_KEY || ""

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { shareId } = await params
    const userId = session.user.id

    const res = await fetch(`${BACKEND}/api/user/${userId}/strategies/import/${shareId}`, {
      method: "POST",
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] import strategy error:", error)
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 })
  }
}
