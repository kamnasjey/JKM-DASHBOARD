import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { updateSignalEntryTracking } from "@/lib/user-data/signals-store"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ signalKey: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
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

  const { entry_taken, outcome } = body

  // Validate entry_taken
  if (entry_taken !== undefined && entry_taken !== null && typeof entry_taken !== "boolean") {
    return NextResponse.json({ ok: false, error: "entry_taken must be boolean or null" }, { status: 400 })
  }

  // Validate outcome
  const validOutcomes = ["win", "loss", "pending", null]
  if (outcome !== undefined && !validOutcomes.includes(outcome)) {
    return NextResponse.json({ ok: false, error: "outcome must be win, loss, pending, or null" }, { status: 400 })
  }

  try {
    await updateSignalEntryTracking(userId, signalKey, entry_taken ?? null, outcome)
    return NextResponse.json({
      ok: true,
      signal_key: signalKey,
      entry_taken: entry_taken ?? null,
      outcome: outcome ?? null,
    })
  } catch (err: unknown) {
    console.error("[user-signals/entry] Error updating entry tracking:", err)
    return NextResponse.json(
      { ok: false, error: "Failed to update entry tracking" },
      { status: 500 }
    )
  }
}
