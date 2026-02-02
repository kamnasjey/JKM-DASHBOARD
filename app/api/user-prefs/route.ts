import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { updateUserPrefs, upsertUserIdentity } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Missing user ID" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const prefs: Record<string, unknown> = {}
  const identity: Record<string, unknown> = {}

  // Prefs (telegram settings)
  if ("telegram_chat_id" in body) prefs.telegram_chat_id = body.telegram_chat_id
  if ("telegram_enabled" in body) prefs.telegram_enabled = body.telegram_enabled

  // Identity (display_name)
  if ("display_name" in body) identity.display_name = body.display_name

  if (Object.keys(prefs).length === 0 && Object.keys(identity).length === 0) {
    return NextResponse.json({ ok: false, message: "No writable fields" }, { status: 400 })
  }

  const updated: string[] = []

  if (Object.keys(prefs).length > 0) {
    await updateUserPrefs(userId, prefs)
    updated.push(...Object.keys(prefs))
  }

  if (Object.keys(identity).length > 0) {
    await upsertUserIdentity(userId, identity)
    updated.push(...Object.keys(identity))
  }

  return NextResponse.json({ ok: true, updated })
}
