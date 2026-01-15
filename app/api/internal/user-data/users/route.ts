import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getPrisma, prismaAvailable } from "@/lib/db"
import { ensureUserInFirestore, getUserDoc, listUsersFromFirestore } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/users
 * 
 * Lists paid users for backend scanning.
 * 
 * Query params:
 *   - source: "firestore" (default for Path-2) | "prisma" - where to list users from
 *   - sync: "true" (default) | "false" - whether to sync Prisma users to Firestore
 * 
 * When source=firestore (default in Path-2 mode):
 *   1. Query Firestore directly for has_paid_access=true
 *   2. Return users (no Prisma dependency)
 * 
 * When source=prisma:
 *   1. Query Prisma for hasPaidAccess=true (requires DATABASE_URL)
 *   2. For each user, ensure they exist in Firestore with identity fields
 *   3. Return enriched user list with Firestore prefs
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  // Default to "firestore" for Path-2 mode
  const source = searchParams.get("source") || "firestore"
  const shouldSync = searchParams.get("sync") !== "false"

  // Firestore mode (default for Path-2)
  if (source === "firestore") {
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
        { status: 500 },
      )
    }
  }

  // Prisma mode: check if available
  if (!prismaAvailable()) {
    return NextResponse.json(
      { ok: false, message: "Prisma not available (DATABASE_URL not set). Use source=firestore instead." },
      { status: 501 },
    )
  }

  const prisma = getPrisma()
  if (!prisma) {
    return NextResponse.json(
      { ok: false, message: "Database unavailable" },
      { status: 503 },
    )
  }

  // Prisma as source, sync to Firestore
  const users = await prisma.user.findMany({
    where: { hasPaidAccess: true },
    select: { id: true, email: true, name: true, hasPaidAccess: true },
  })

  const enriched = [] as Array<Record<string, unknown>>
  for (const u of users) {
    // Sync identity to Firestore (makes Firestore canonical over time)
    if (shouldSync) {
      try {
        await ensureUserInFirestore(u.id, {
          email: u.email,
          name: u.name,
          has_paid_access: u.hasPaidAccess,
        })
      } catch {
        // Non-fatal: continue even if sync fails
      }
    }

    // Get full user doc from Firestore (includes prefs)
    let prefs: Record<string, unknown> = {}
    try {
      const doc = await getUserDoc(u.id)
      if (doc) {
        prefs = doc as Record<string, unknown>
      }
    } catch {
      prefs = {}
    }

    enriched.push({
      user_id: u.id,
      email: u.email,
      name: u.name,
      has_paid_access: u.hasPaidAccess,
      telegram_chat_id: prefs.telegram_chat_id ?? null,
      telegram_enabled: prefs.telegram_enabled ?? null,
      scan_enabled: prefs.scan_enabled ?? null,
      plan: prefs.plan ?? null,
      plan_status: prefs.plan_status ?? null,
    })
  }

  return NextResponse.json({
    ok: true,
    users: enriched,
    count: enriched.length,
    source: "prisma",
    synced_to_firestore: shouldSync,
  })
}
