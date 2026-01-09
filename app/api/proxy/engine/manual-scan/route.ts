import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const backendUrl = process.env.BACKEND_BASE_URL || "http://localhost:8000"
  const apiKey = process.env.INTERNAL_API_KEY || ""

  try {
    const response = await fetch(`${backendUrl}/api/engine/manual-scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey,
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  }
}
