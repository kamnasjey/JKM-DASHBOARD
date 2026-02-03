import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { listUserSignals, updateSignalStatus } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/signals/evaluate
 *
 * List pending signals for outcome evaluation.
 *
 * Query params:
 *   - user_id (required): User ID
 *   - limit (optional): Max signals (default 100)
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")?.trim()
  const limitStr = searchParams.get("limit")

  if (!userId) {
    return NextResponse.json({ ok: false, message: "user_id required" }, { status: 400 })
  }

  let limit = limitStr ? parseInt(limitStr, 10) : 100
  if (isNaN(limit) || limit < 1) limit = 100
  if (limit > 500) limit = 500

  try {
    // Get all recent signals (limit higher to filter for pending)
    const allSignals = await listUserSignals(userId, { limit: limit * 3 })

    // Filter for pending signals (status is "pending" or null/undefined)
    const pendingSignals = allSignals.filter(s =>
      !s.status || s.status === "pending"
    ).slice(0, limit)

    // Map to format expected by scanner
    const pending = pendingSignals.map(s => ({
      signal_key: s.signal_key,
      pair: s.symbol,
      direction: s.direction,
      timeframe: s.timeframe,
      entry: s.entry,
      sl: s.sl,
      tp: s.tp,
      generated_at: s.generated_at || s.createdAt,
    }))

    return NextResponse.json({ ok: true, pending, count: pending.length })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}

/**
 * POST /api/internal/user-data/signals/evaluate
 *
 * Update signal outcome (win/loss/expired).
 *
 * Body:
 *   - user_id (required)
 *   - signal_key (required)
 *   - status (required): "hit_tp" | "hit_sl" | "expired" | "win" | "loss"
 *   - resolved_at (optional): ISO timestamp
 *   - resolved_price (optional): Price at resolution
 */
export async function POST(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const userId = String(body?.user_id || "").trim()
  const signalKey = String(body?.signal_key || "").trim()
  const status = String(body?.status || "").trim()
  const resolvedAt = body?.resolved_at ? String(body.resolved_at) : undefined
  const resolvedPrice = body?.resolved_price !== undefined ? Number(body.resolved_price) : undefined

  if (!userId || !signalKey || !status) {
    return NextResponse.json(
      { ok: false, message: "user_id, signal_key, status required" },
      { status: 400 },
    )
  }

  // Normalize status
  let normalizedStatus = status
  if (status === "win" || status === "hit_tp") normalizedStatus = "hit_tp"
  if (status === "loss" || status === "hit_sl") normalizedStatus = "hit_sl"

  try {
    await updateSignalStatus(userId, signalKey, normalizedStatus, {
      resolved_at: resolvedAt,
      resolved_price: resolvedPrice,
    })

    return NextResponse.json({ ok: true, signal_key: signalKey, status: normalizedStatus })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}
