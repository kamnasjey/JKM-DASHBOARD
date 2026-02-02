import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getUserDoc } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Missing user ID" }, { status: 401 })
  }

  try {
    const userDoc = await getUserDoc(userId)

    // Return profile data (merge with session data for fallback)
    return NextResponse.json({
      ok: true,
      user_id: userId,
      email: userDoc?.email || session.user.email || null,
      name: userDoc?.name || session.user.name || null,
      display_name: userDoc?.display_name || null,
      telegram_chat_id: userDoc?.telegram_chat_id || null,
      telegram_enabled: userDoc?.telegram_enabled || false,
      has_paid_access: userDoc?.has_paid_access || false,
      plan: userDoc?.plan || null,
      plan_status: userDoc?.plan_status || null,
      scan_enabled: userDoc?.scan_enabled || false,
    })
  } catch (err) {
    console.error("[api/profile] Error fetching user:", err)
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
