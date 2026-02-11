import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

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

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${VPS_BASE_URL}/api/telegram/connect-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify({ user_id: userId }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: data.detail || "Холболтын линк үүсгэж чадсангүй" },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[telegram/connect] Error:", err)

    if (err?.name === "AbortError") {
      return NextResponse.json(
        { ok: false, message: "Сервертэй холбогдож чадсангүй (timeout)" },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { ok: false, message: "VPS сервертэй холбогдож чадсангүй" },
      { status: 500 }
    )
  }
}
