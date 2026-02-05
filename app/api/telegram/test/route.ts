import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getUserDoc } from "@/lib/user-data/user-store"

export const runtime = "nodejs"

const VPS_BASE_URL = process.env.VPS_API_URL || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ""

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Missing user ID" }, { status: 401 })
  }

  // Get user's telegram_chat_id from Firestore
  const userDoc = await getUserDoc(userId)
  const chatId = userDoc?.telegram_chat_id

  if (!chatId) {
    return NextResponse.json({ ok: false, message: "Telegram Chat ID тохируулаагүй байна" }, { status: 400 })
  }

  try {
    // Call VPS endpoint to send test message with 15s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(`${VPS_BASE_URL}/telegram/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: data.detail || data.message || "Telegram илгээхэд алдаа гарлаа" },
        { status: response.status }
      )
    }

    return NextResponse.json({ ok: true, message: "Тест мессеж илгээгдлээ!" })
  } catch (err: any) {
    console.error("[telegram/test] Error:", err)

    // Check if it's a timeout/abort error
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { ok: true, message: "Мессеж илгээгдсэн байх магадлалтай (timeout)" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { ok: false, message: "VPS сервертэй холбогдож чадсангүй" },
      { status: 500 }
    )
  }
}
