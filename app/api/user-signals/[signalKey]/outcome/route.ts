import { NextRequest, NextResponse } from "next/server"
import { updateSignalEntryTracking } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ""

function requireInternalKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key") || ""
  return key === INTERNAL_API_KEY && INTERNAL_API_KEY.length > 0
}

/**
 * POST /api/user-signals/{signalKey}/outcome
 *
 * Update outcome from Telegram callback.
 * Body: { outcome: "win" | "loss", user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signalKey: string }> }
) {
  if (!requireInternalKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { signalKey: rawSignalKey } = await params
  if (!rawSignalKey) {
    return NextResponse.json({ ok: false, error: "Missing signalKey" }, { status: 400 })
  }
  // Sanitize signal key - Firestore doc IDs cannot contain "/"
  const signalKey = rawSignalKey.replace(/\//g, "_")

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { outcome, user_id } = body

  if (!user_id) {
    return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 })
  }

  const validOutcomes = ["win", "loss", "pending"]
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ ok: false, error: "outcome must be win, loss, or pending" }, { status: 400 })
  }

  try {
    // Update with entry_taken=true (since outcome means they took entry)
    await updateSignalEntryTracking(user_id, signalKey, true, outcome)
    return NextResponse.json({
      ok: true,
      signal_key: signalKey,
      user_id,
      outcome,
    })
  } catch (err: unknown) {
    console.error("[user-signals/outcome] Error:", err)
    return NextResponse.json(
      { ok: false, error: "Failed to update outcome" },
      { status: 500 }
    )
  }
}
