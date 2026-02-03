import { NextRequest, NextResponse } from "next/server"
import { updateSignalEntryTracking } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ""

function requireInternalKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key") || ""
  return key === INTERNAL_API_KEY && INTERNAL_API_KEY.length > 0
}

/**
 * POST /api/user-signals/{signalKey}/entry
 *
 * Update entry_taken status from Telegram callback.
 * Body: { entry_taken: boolean, user_id: string }
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

  const { entry_taken, user_id } = body

  if (!user_id) {
    return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 })
  }

  if (typeof entry_taken !== "boolean") {
    return NextResponse.json({ ok: false, error: "entry_taken must be boolean" }, { status: 400 })
  }

  try {
    await updateSignalEntryTracking(user_id, signalKey, entry_taken)
    return NextResponse.json({
      ok: true,
      signal_key: signalKey,
      user_id,
      entry_taken,
    })
  } catch (err: unknown) {
    console.error("[user-signals/entry] Error:", err)
    return NextResponse.json(
      { ok: false, error: "Failed to update entry" },
      { status: 500 }
    )
  }
}
