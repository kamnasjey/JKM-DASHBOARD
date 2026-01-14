import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getUserStrategiesFromFirestore, setUserStrategiesInFirestore } from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(_request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const strategies = await getUserStrategiesFromFirestore(userId)
  return NextResponse.json({ ok: true, user_id: userId, strategies, count: strategies.length })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const userId = (await params).userId
  const body = await request.json().catch(() => null)
  const strategies = body?.strategies

  if (!Array.isArray(strategies)) {
    return NextResponse.json({ ok: false, message: "Invalid payload: strategies[] required" }, { status: 400 })
  }

  await setUserStrategiesInFirestore(userId, strategies)
  return NextResponse.json({ ok: true })
}
