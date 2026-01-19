import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { listUserSignals } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitStr = searchParams.get("limit")
  const symbol = searchParams.get("symbol")?.trim()
  const status = searchParams.get("status")?.trim()

  let limit = limitStr ? parseInt(limitStr, 10) : 50
  if (isNaN(limit) || limit < 1) limit = 50
  if (limit > 500) limit = 500

  try {
    const signals = await listUserSignals(userId, { limit, symbol: symbol || null, status: status || null })
    return NextResponse.json({
      ok: true,
      user_id: userId,
      signals,
      count: signals.length,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: "Failed to list signals" },
      { status: 500 }
    )
  }
}
