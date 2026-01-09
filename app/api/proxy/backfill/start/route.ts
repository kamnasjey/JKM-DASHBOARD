import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY || ""

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const response = await fetch(`${BACKEND_URL}/api/backfill/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("[Proxy] /api/backfill/start error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
