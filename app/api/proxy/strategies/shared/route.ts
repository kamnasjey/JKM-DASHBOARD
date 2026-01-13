import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.INTERNAL_BACKEND_URL || "http://localhost:8000"
const API_KEY = process.env.INTERNAL_API_KEY || ""

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/strategies/shared`, {
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] shared strategies error:", error)
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 })
  }
}

