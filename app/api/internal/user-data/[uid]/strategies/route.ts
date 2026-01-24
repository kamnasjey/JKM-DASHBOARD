/**
 * Internal API: User Strategies
 * Backend -> Dashboard communication for strategy persistence
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalKey } from "@/lib/internal-auth"
import { listStrategies } from "@/lib/user-data/strategies-firestore-store"
import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"
import { seedStarterStrategiesForUser } from "@/lib/user-data/starter-strategies"
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
    const db = getFirebaseAdminDb()
    let data = await listStrategies(uid, { limit: 200 })

    if (data.strategies.length === 0) {
      await seedStarterStrategiesForUser(db, uid)
      data = await listStrategies(uid, { limit: 200 })
    }

    let strategies = data.strategies.map((s) => ({
      strategy_id: s.id,
      name: s.name,
      enabled: s.enabled,
      detectors: s.detectors || [],
      symbols: s.symbols || [],
      timeframe: s.timeframe || null,
      config: s.config || {},
    }))

    const enabledCount = strategies.filter((s) => s.enabled).length
    if (enabledCount === 0 && strategies.length > 0) {
      const config = await getStrategyConfig(uid)
      const envDefault = (process.env.DEFAULT_STARTER_STRATEGY_ID || "").trim()
      const preferredId = (config.activeStrategyId || envDefault || "starter_EDGE_2").trim()
      const defaultId = strategies.find((s) => s.strategy_id === preferredId)?.strategy_id || strategies[0].strategy_id

      if (!config.activeStrategyId || config.activeStrategyId !== defaultId) {
        await setActiveStrategyId(uid, defaultId)
      }

      const ref = db.collection("users").doc(uid).collection("strategies")
      const batch = db.batch()
      let changed = 0

      strategies = strategies.map((s) => {
        const shouldEnable = s.strategy_id === defaultId
        if (s.enabled !== shouldEnable) {
          batch.set(
            ref.doc(s.strategy_id),
            stripUndefinedDeep({
              enabled: shouldEnable,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true },
          )
          changed += 1
        }
        return { ...s, enabled: shouldEnable }
      })

      if (changed > 0) {
        await batch.commit()
      }
    }

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
