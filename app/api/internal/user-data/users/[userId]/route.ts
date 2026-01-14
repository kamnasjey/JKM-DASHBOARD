import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

function pickWritablePrefs(input: any): Record<string, unknown> {
  if (!input || typeof input !== "object") return {}

  const out: Record<string, unknown> = {}

  // Telegram prefs
  if ("telegram_chat_id" in input) out.telegram_chat_id = input.telegram_chat_id
  if ("telegram_enabled" in input) out.telegram_enabled = input.telegram_enabled
  if ("telegram_connected_ts" in input) out.telegram_connected_ts = input.telegram_connected_ts

  // Scanner prefs
  if ("scan_enabled" in input) out.scan_enabled = input.scan_enabled

  // Plan/info (optional)
  if ("plan" in input) out.plan = input.plan
  if ("plan_status" in input) out.plan_status = input.plan_status

  return out
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const db = getFirebaseAdminDb()

  const snap = await db.collection("users").doc(userId).get()
  const prefs = (snap.exists ? (snap.data() as any) : {}) || {}

  // Optional: include Prisma user record if present
  let user: any = null
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, hasPaidAccess: true },
    })
  } catch {
    user = null
  }

  return NextResponse.json({ ok: true, user_id: userId, user, prefs })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const body = await request.json().catch(() => null)
  const prefs = pickWritablePrefs(body?.prefs ?? body)

  if (!prefs || Object.keys(prefs).length === 0) {
    return NextResponse.json({ ok: false, message: "No writable prefs in payload" }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  await db
    .collection("users")
    .doc(userId)
    .set({ ...prefs, updatedAt: new Date().toISOString() }, { merge: true })

  return NextResponse.json({ ok: true })
}
