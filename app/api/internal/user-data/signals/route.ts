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

  // Build payload with only non-empty values to avoid overwriting existing data
  const payload: Record<string, unknown> = {
    signal_key: signalKey,
    user_id: userId,
  }

  // Only add fields that have actual values
  if ((signal as any).symbol || (signal as any).pair) {
    payload.symbol = String((signal as any).symbol || (signal as any).pair)
  }
  if ((signal as any).direction) {
    payload.direction = String((signal as any).direction)
  }
  if ((signal as any).timeframe) {
    payload.timeframe = String((signal as any).timeframe)
  }
  if ((signal as any).entry) {
    payload.entry = Number((signal as any).entry)
  }
  if ((signal as any).sl) {
    payload.sl = Number((signal as any).sl)
  }
  if ((signal as any).tp) {
    payload.tp = Number((signal as any).tp)
  }
  if ((signal as any).rr) {
    payload.rr = Number((signal as any).rr)
  }
  if ((signal as any).strategy_name) {
    payload.strategy_name = String((signal as any).strategy_name)
  }
  if ((signal as any).generated_at) {
    payload.generated_at = String((signal as any).generated_at)
  }
  if ((signal as any).status) {
    payload.status = String((signal as any).status)
  }
  if ((signal as any).outcome) {
    payload.outcome = String((signal as any).outcome)
  }
  if ((signal as any).entry_taken !== undefined) {
    payload.entry_taken = Boolean((signal as any).entry_taken)
  }
  if ((signal as any).evidence) {
    payload.evidence = (signal as any).evidence
  }
  if ((signal as any).meta) {
    payload.meta = (signal as any).meta
  }

  await upsertUserSignal(userId, signalKey, payload as any)

  return NextResponse.json({ ok: true })
}
