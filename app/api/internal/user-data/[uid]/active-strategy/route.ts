/**
 * Internal API: Active Strategy
 * Backend -> Dashboard communication for active strategy persistence
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalKey } from "@/lib/internal-auth"
import { getStrategyConfig, setActiveStrategyId } from "@/lib/user-data/strategy-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{ uid: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = requireInternalKey(request)
  if (authError) return authError

  const { uid } = await params
  
  if (!uid || uid.length < 3) {
    return NextResponse.json({ ok: false, error: "Invalid uid" }, { status: 400 })
  }

  try {
    const data = await getStrategyConfig(uid)
    return NextResponse.json({
      ok: true,
      uid,
      activeStrategyId: data.activeStrategyId ?? null,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    console.error("[internal/active-strategy] GET error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load active strategy" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authError = requireInternalKey(request)
  if (authError) return authError

  const { uid } = await params
  
  if (!uid || uid.length < 3) {
    return NextResponse.json({ ok: false, error: "Invalid uid" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const activeStrategyId = body.activeStrategyId

    if (activeStrategyId !== null && typeof activeStrategyId !== "string") {
      return NextResponse.json({ ok: false, error: "activeStrategyId must be string or null" }, { status: 400 })
    }

    await setActiveStrategyId(uid, activeStrategyId ?? null)

    return NextResponse.json({
      ok: true,
      uid,
      activeStrategyId,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("[internal/active-strategy] PUT error:", error)
    return NextResponse.json({ ok: false, error: "Failed to save active strategy" }, { status: 500 })
  }
}
