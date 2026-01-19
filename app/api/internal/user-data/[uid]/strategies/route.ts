/**
 * Internal API: User Strategies
 * Backend -> Dashboard communication for strategy persistence
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalKey } from "@/lib/internal-auth"
import { listStrategies } from "@/lib/user-data/strategies-firestore-store"
import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"

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
    const data = await listStrategies(uid, { limit: 200 })
    const strategies = data.strategies.map((s) => ({
      strategy_id: s.id,
      name: s.name,
      enabled: s.enabled,
      detectors: s.detectors || [],
      symbols: s.symbols || [],
      timeframe: s.timeframe || null,
      config: s.config || {},
    }))
    return NextResponse.json({
      ok: true,
      uid,
      strategies,
      updatedAt: new Date().toISOString(),
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

    const db = getFirebaseAdminDb()
    const ref = db.collection("users").doc(uid).collection("strategies")

    for (const s of strategies) {
      const id = String(s.id || s.strategy_id || "").trim()
      const name = String(s.name || s.strategy_name || id).trim()
      if (!id || !name) continue

      await ref.doc(id).set(
        stripUndefinedDeep({
          name,
          enabled: s.enabled ?? true,
          detectors: Array.isArray(s.detectors) ? s.detectors : [],
          symbols: Array.isArray(s.symbols) ? s.symbols : null,
          timeframe: s.timeframe ?? null,
          config: s.config || {},
          updatedAt: new Date().toISOString(),
          createdAt: s.createdAt ?? new Date().toISOString(),
        }),
        { merge: true },
      )
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
