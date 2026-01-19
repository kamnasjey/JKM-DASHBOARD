/**
 * Proxy to Backend: POST /api/internal/user-data/active-strategy-map/{uid}
 * Sets per-symbol strategy mapping
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { setStrategyMap } from "@/lib/user-data/strategy-config-store"

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

    const rawMap = body?.map || {}
    const cleanedMap: Record<string, string> = {}
    for (const [symbol, value] of Object.entries(rawMap)) {
      if (typeof value !== "string") continue
      const trimmed = value.trim()
      if (!trimmed || trimmed === "__default__") continue
      cleanedMap[symbol] = trimmed
    }

    await setStrategyMap(uid, cleanedMap)

    return NextResponse.json({
      ok: true,
      uid,
      activeStrategyMap: cleanedMap,
    })
  } catch (error: any) {
    console.error("[proxy/strategy-map] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    )
  }
}
