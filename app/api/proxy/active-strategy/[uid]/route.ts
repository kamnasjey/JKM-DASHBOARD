/**
 * Proxy to Backend: POST /api/internal/user-data/active-strategy/{uid}
 * Sets the global active strategy ID
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { setActiveStrategyId } from "@/lib/user-data/strategy-config-store"

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

  try {
    const body = await request.json()

    const activeStrategyId = body?.activeStrategyId ?? null
    await setActiveStrategyId(uid, activeStrategyId)

    return NextResponse.json({
      ok: true,
      uid,
      activeStrategyId,
    })
  } catch (error: any) {
    console.error("[proxy/active-strategy] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    )
  }
}
