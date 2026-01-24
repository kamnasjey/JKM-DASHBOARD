import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { updateUserPrefs } from "@/lib/user-data/user-store"

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
  if ("telegram_chat_id" in body) prefs.telegram_chat_id = body.telegram_chat_id
  if ("telegram_enabled" in body) prefs.telegram_enabled = body.telegram_enabled

  if (Object.keys(prefs).length === 0) {
    return NextResponse.json({ ok: false, message: "No writable prefs" }, { status: 400 })
  }

  await updateUserPrefs(userId, prefs)
  return NextResponse.json({ ok: true, updated: Object.keys(prefs) })
}
