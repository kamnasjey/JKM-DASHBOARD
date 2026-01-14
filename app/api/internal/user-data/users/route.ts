import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { prisma } from "@/lib/db"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  // Only scan paid users by default.
  const users = await prisma.user.findMany({
    where: { hasPaidAccess: true },
    select: { id: true, email: true, name: true, hasPaidAccess: true },
  })

  // Enrich with Firestore prefs if present (telegram, scan_enabled, etc.)
  const db = getFirebaseAdminDb()

  const enriched = [] as Array<Record<string, unknown>>
  for (const u of users) {
    let prefs: Record<string, unknown> = {}
    try {
      const snap = await db.collection("users").doc(u.id).get()
      prefs = (snap.exists ? (snap.data() as any) : {}) || {}
    } catch {
      prefs = {}
    }

    enriched.push({
      user_id: u.id,
      email: u.email,
      name: u.name,
      has_paid_access: u.hasPaidAccess,
      // common prefs keys (optional)
      telegram_chat_id: prefs.telegram_chat_id ?? null,
      telegram_enabled: prefs.telegram_enabled ?? null,
      scan_enabled: prefs.scan_enabled ?? null,
      plan: prefs.plan ?? null,
    })
  }

  return NextResponse.json({ ok: true, users: enriched, count: enriched.length })
}
