import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ""

function requireInternalKey(request: NextRequest): boolean {
  const key = request.headers.get("x-internal-api-key") || ""
  return key === INTERNAL_API_KEY && INTERNAL_API_KEY.length > 0
}

/**
 * GET /api/internal/user-data/telegram/lookup?chat_id=123456
 *
 * Reverse lookup: find user_id by Telegram chat_id.
 * Used by VPS to identify which user pressed a Telegram button.
 */
export async function GET(request: NextRequest) {
  if (!requireInternalKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("chat_id")?.trim()

  if (!chatId) {
    return NextResponse.json({ ok: false, error: "chat_id required" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()

    // Query users collection for matching telegram_chat_id
    const usersRef = db.collection("users")
    const snapshot = await usersRef
      .where("telegram_chat_id", "==", chatId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      // Also try as number (some implementations store as number)
      const numericChatId = parseInt(chatId, 10)
      if (!isNaN(numericChatId)) {
        const numSnapshot = await usersRef
          .where("telegram_chat_id", "==", numericChatId)
          .limit(1)
          .get()

        if (!numSnapshot.empty) {
          const userId = numSnapshot.docs[0].id
          return NextResponse.json({ ok: true, user_id: userId })
        }
      }

      return NextResponse.json({ ok: false, error: "User not found", user_id: null }, { status: 404 })
    }

    const userId = snapshot.docs[0].id
    return NextResponse.json({ ok: true, user_id: userId })

  } catch (err: unknown) {
    console.error("[telegram/lookup] Error:", err)
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
