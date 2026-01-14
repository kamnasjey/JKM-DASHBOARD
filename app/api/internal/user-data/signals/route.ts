import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { upsertUserSignal, listUserSignals } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/signals
 * 
 * List signals for a user from Firestore.
 * 
 * Query params:
 *   - user_id (required): User ID to list signals for
 *   - limit (optional): Max signals to return (default 50, max 500)
 *   - symbol (optional): Filter by symbol/pair
 *   - status (optional): Filter by status (pending, hit_tp, hit_sl, expired)
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")?.trim()
  const limitStr = searchParams.get("limit")
  const symbol = searchParams.get("symbol")?.trim()
  const status = searchParams.get("status")?.trim()

  if (!userId) {
    return NextResponse.json({ ok: false, message: "user_id query param required" }, { status: 400 })
  }

  let limit = limitStr ? parseInt(limitStr, 10) : 50
  if (isNaN(limit) || limit < 1) limit = 50
  if (limit > 500) limit = 500

  try {
    const signals = await listUserSignals(userId, { limit, symbol, status })
    return NextResponse.json({
      ok: true,
      user_id: userId,
      signals,
      count: signals.length,
      filters: { limit, symbol: symbol || null, status: status || null },
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed to list signals: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}

/**
 * POST /api/internal/user-data/signals
 * 
 * Upsert a signal for a user in Firestore.
 * 
 * Body:
 *   - user_id (required)
 *   - signal_key (required)
 *   - signal (required): Signal object with symbol, direction, timeframe, entry, sl, tp, rr, etc.
 */
export async function POST(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const userId = String(body?.user_id || "").trim()
  const signalKey = String(body?.signal_key || "").trim()
  const signal = body?.signal

  if (!userId || !signalKey || !signal || typeof signal !== "object") {
    return NextResponse.json(
      { ok: false, message: "Invalid payload: user_id, signal_key, signal required" },
      { status: 400 },
    )
  }

  await upsertUserSignal(userId, signalKey, {
    signal_key: signalKey,
    user_id: userId,
    symbol: String((signal as any).symbol || (signal as any).pair || ""),
    direction: String((signal as any).direction || ""),
    timeframe: String((signal as any).timeframe || ""),
    entry: Number((signal as any).entry || 0),
    sl: Number((signal as any).sl || 0),
    tp: Number((signal as any).tp || 0),
    rr: Number((signal as any).rr || 0),
    strategy_name: (signal as any).strategy_name ? String((signal as any).strategy_name) : undefined,
    generated_at: (signal as any).generated_at ? String((signal as any).generated_at) : undefined,
    status: (signal as any).status ? String((signal as any).status) : undefined,
    evidence: (signal as any).evidence,
    meta: (signal as any).meta,
  })

  return NextResponse.json({ ok: true })
}
