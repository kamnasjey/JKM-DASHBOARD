import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { listStrategies } from "@/lib/user-data/strategies-firestore-store"
import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"
import { seedStarterStrategiesForUser } from "@/lib/user-data/starter-strategies"
import { getStrategyConfig, setActiveStrategyId } from "@/lib/user-data/strategy-config-store"

export const runtime = "nodejs"

function validateUserId(userId: string | undefined) {
  if (!userId || userId === "undefined" || userId === "null" || userId.trim() === "") {
    return { ok: false as const, status: 400 as const, message: "Missing or invalid userId" }
  }
  return { ok: true as const }
}

function toSafeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(_request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  let userId: string | undefined
  try {
    userId = (await params).userId

    const v = validateUserId(userId)
    if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })
    
    const db = getFirebaseAdminDb()
    let data = await listStrategies(userId, { limit: 200 })

    if (data.strategies.length === 0) {
      await seedStarterStrategiesForUser(db, userId)
      data = await listStrategies(userId, { limit: 200 })
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
      const config = await getStrategyConfig(userId)
      const envDefault = (process.env.DEFAULT_STARTER_STRATEGY_ID || "").trim()
      const preferredId = (config.activeStrategyId || envDefault || "starter_EDGE_2").trim()
      const defaultId = strategies.find((s) => s.strategy_id === preferredId)?.strategy_id || strategies[0].strategy_id

      if (!config.activeStrategyId || config.activeStrategyId !== defaultId) {
        await setActiveStrategyId(userId, defaultId)
      }

      const ref = db.collection("users").doc(userId).collection("strategies")
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

    return NextResponse.json({ ok: true, user_id: userId, strategies, count: strategies.length })
  } catch (err: any) {
    // Graceful handling for NOT_FOUND or first-time users
    // Firestore NOT_FOUND error code is 5 (number) or "NOT_FOUND" (string)
    const errCode = err?.code
    const errMsg = (err?.message || "").toLowerCase()
    
    const isNotFound = 
      errCode === 5 || 
      errCode === "5" ||
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") ||
      errMsg.includes("not found") || 
      errMsg.includes("no document")
    
    if (isNotFound) {
      console.log(`[internal strategies GET] New user (no doc): ${userId}`)
      return NextResponse.json({
        ok: true,
        user_id: userId,
        strategies: [],
        count: 0,
        meta: { createdDefault: true },
      })
    }

    console.error("[internal strategies GET] failed", {
      userId,
      errorCode: errCode,
      errorMessage: toSafeErrorMessage(err),
    })

    return NextResponse.json(
      {
        ok: false,
        message: "Internal strategies GET failed",
        details: toSafeErrorMessage(err),
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  let userId: string | undefined
  try {
    userId = (await params).userId
    const v = validateUserId(userId)
    if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })

    const body = await request.json().catch(() => null)
    const strategies = body?.strategies

    if (!Array.isArray(strategies)) {
      return NextResponse.json({ ok: false, message: "Invalid payload: strategies[] required" }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const ref = db.collection("users").doc(userId).collection("strategies")

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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // Graceful handling for NOT_FOUND - use set with merge:true which creates doc if missing
    const errCode = err?.code || ""
    const errMsg = (err?.message || "").toLowerCase()
    
    if (
      errCode === 5 || 
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") || 
      errMsg.includes("not found")
    ) {
      console.log(`[internal strategies PUT] NOT_FOUND for ${userId}, but set(merge:true) should handle this`)
    }

    console.error("[internal strategies PUT] failed", {
      userId,
      errorCode: errCode,
      errorMessage: toSafeErrorMessage(err),
      error: err,
    })

    return NextResponse.json(
      {
        ok: false,
        message: "Internal strategies PUT failed",
        details: toSafeErrorMessage(err),
      },
      { status: 500 }
    )
  }
}
