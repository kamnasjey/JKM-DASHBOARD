import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { listUsersFromFirestore } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/users
 *
 * Lists paid users for backend scanning.
 * All data from Firestore.
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  try {
    const users = await listUsersFromFirestore({ onlyPaid: true })
    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
        has_paid_access: u.has_paid_access,
        telegram_chat_id: u.telegram_chat_id ?? null,
        telegram_enabled: u.telegram_enabled ?? null,
        scan_enabled: u.scan_enabled ?? null,
        plan: u.plan ?? null,
        plan_status: u.plan_status ?? null,
      })),
      count: users.length,
      source: "firestore",
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Firestore error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
