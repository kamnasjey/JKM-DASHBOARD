import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { listUserSignals } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ""

function checkInternalKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key") || ""
  return key === INTERNAL_API_KEY && INTERNAL_API_KEY.length > 0
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Support both session auth (Dashboard UI) and internal API key (VPS)
  let userId: string | undefined

  if (checkInternalKey(request)) {
    // Internal API: user_id from query param
    userId = searchParams.get("user_id")?.trim()
  } else {
    // Session auth: user_id from session
    const session = await getServerSession(authOptions)
    userId = (session?.user as any)?.id as string | undefined
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const limitStr = searchParams.get("limit")
  const symbol = searchParams.get("symbol")?.trim()
  const status = searchParams.get("status")?.trim()
  const entryTaken = searchParams.get("entry_taken")?.trim()

  let limit = limitStr ? parseInt(limitStr, 10) : 50
  if (isNaN(limit) || limit < 1) limit = 50
  if (limit > 500) limit = 500

  try {
    let signals = await listUserSignals(userId, { limit, symbol: symbol || null, status: status || null })

    // Filter by entry_taken if specified
    if (entryTaken === "true") {
      signals = signals.filter(s => s.entry_taken === true)
    } else if (entryTaken === "false") {
      signals = signals.filter(s => s.entry_taken === false)
    }

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
