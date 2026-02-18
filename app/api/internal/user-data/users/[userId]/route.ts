import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getUserDoc, upsertUserIdentity, updateUserPrefs } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

function validateUserId(userId: string | undefined) {
  if (!userId || userId === "undefined" || userId === "null") {
    return { ok: false as const, status: 401 as const, message: "Missing or invalid userId" }
  }
  return { ok: true as const }
}

/**
 * Allowed fields for preferences (non-identity).
 */
const WRITABLE_PREFS_KEYS = [
  "telegram_chat_id",
  "telegram_enabled",
  "telegram_connected_ts",
  "scan_enabled",
  "plan",
  "plan_status",
  "strategies",
  "poi_notify_symbols",
] as const

/**
 * Allowed fields for identity.
 */
const WRITABLE_IDENTITY_KEYS = ["email", "name", "has_paid_access", "plan", "plan_status"] as const

function pickWritablePrefs(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {}

  const out: Record<string, unknown> = {}
  const obj = input as Record<string, unknown>

  for (const key of WRITABLE_PREFS_KEYS) {
    if (key in obj) out[key] = obj[key]
  }

  return out
}

function pickWritableIdentity(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {}

  const out: Record<string, unknown> = {}
  const obj = input as Record<string, unknown>

  for (const key of WRITABLE_IDENTITY_KEYS) {
    if (key in obj) out[key] = obj[key]
  }

  return out
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const v = validateUserId(userId)
  if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })

  // Get user doc from Firestore (canonical)
  const firestoreDoc = await getUserDoc(userId)
  const prefs = firestoreDoc || {}

  return NextResponse.json({
    ok: true,
    user_id: userId,
    prefs,
    source: firestoreDoc ? "firestore" : "none",
  })
}

/**
 * PUT /api/internal/user-data/users/{userId}
 *
 * Update user preferences and/or identity fields in Firestore.
 *
 * Body formats:
 *   { prefs: { telegram_chat_id, scan_enabled, ... } }  - update prefs only
 *   { identity: { email, name, has_paid_access, ... } } - update identity only
 *   { prefs: {...}, identity: {...} }                   - update both
 *   { telegram_chat_id, scan_enabled, ... }             - legacy: treated as prefs
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const v = validateUserId(userId)
  if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 })
  }

  // Extract prefs and identity from body
  let prefsInput: unknown = null
  let identityInput: unknown = null

  if ("prefs" in body) {
    prefsInput = body.prefs
  } else if ("identity" in body) {
    // If only identity is provided, skip prefs
  } else {
    // Legacy format: entire body is prefs
    prefsInput = body
  }

  if ("identity" in body) {
    identityInput = body.identity
  }

  const prefs = pickWritablePrefs(prefsInput)
  const identity = pickWritableIdentity(identityInput)

  if (Object.keys(prefs).length === 0 && Object.keys(identity).length === 0) {
    return NextResponse.json({ ok: false, message: "No writable prefs or identity in payload" }, { status: 400 })
  }

  // Update Firestore
  if (Object.keys(prefs).length > 0) {
    await updateUserPrefs(userId, prefs)
  }

  if (Object.keys(identity).length > 0) {
    await upsertUserIdentity(userId, identity)
  }

  return NextResponse.json({
    ok: true,
    updated: {
      prefs: Object.keys(prefs),
      identity: Object.keys(identity),
    },
  })
}
