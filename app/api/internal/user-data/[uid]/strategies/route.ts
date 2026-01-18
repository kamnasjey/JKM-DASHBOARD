/**
 * Internal API: User Strategies
 * Backend -> Dashboard communication for strategy persistence
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalKey } from "@/lib/internal-auth"
import { getStrategies, saveStrategies } from "@/lib/internal-storage"

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
    const data = await getStrategies(uid)
    return NextResponse.json({
      ok: true,
      uid,
      strategies: data.strategies,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    console.error("[internal/strategies] GET error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load strategies" }, { status: 500 })
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
    const strategies = body.strategies

    if (!Array.isArray(strategies)) {
      return NextResponse.json({ ok: false, error: "strategies must be an array" }, { status: 400 })
    }

    // Validate each strategy has at least id and name
    for (const s of strategies) {
      if (!s.id || typeof s.id !== "string") {
        return NextResponse.json({ ok: false, error: "Each strategy must have a string id" }, { status: 400 })
      }
      if (!s.name || typeof s.name !== "string") {
        return NextResponse.json({ ok: false, error: "Each strategy must have a string name" }, { status: 400 })
      }
    }

    const success = await saveStrategies(uid, strategies)
    
    if (!success) {
      return NextResponse.json({ ok: false, error: "Failed to save strategies" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      uid,
      saved: strategies.length,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("[internal/strategies] PUT error:", error)
    return NextResponse.json({ ok: false, error: "Failed to save strategies" }, { status: 500 })
  }
}
