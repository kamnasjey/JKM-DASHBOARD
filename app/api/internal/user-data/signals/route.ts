import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { upsertUserSignal } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

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
