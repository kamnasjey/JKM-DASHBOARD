/**
 * Internal API: Strategy Map (symbol -> strategyId)
 * Backend -> Dashboard communication for per-symbol strategy mapping
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalKey } from "@/lib/internal-auth"
import { getStrategyMap, saveStrategyMap } from "@/lib/internal-storage"

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
    const data = await getStrategyMap(uid)
    return NextResponse.json({
      ok: true,
      uid,
      map: data.map,
      default: data.default,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    console.error("[internal/strategy-map] GET error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load strategy map" }, { status: 500 })
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
    const map = body.map
    const defaultId = body.default

    if (!map || typeof map !== "object" || Array.isArray(map)) {
      return NextResponse.json({ ok: false, error: "map must be an object" }, { status: 400 })
    }

    // Validate all values are strings or empty strings
    for (const [symbol, strategyId] of Object.entries(map)) {
      if (typeof strategyId !== "string") {
        return NextResponse.json({ 
          ok: false, 
          error: `map[${symbol}] must be a string strategyId` 
        }, { status: 400 })
      }
    }

    if (defaultId !== undefined && typeof defaultId !== "string") {
      return NextResponse.json({ ok: false, error: "default must be a string" }, { status: 400 })
    }

    const success = await saveStrategyMap(uid, map as Record<string, string>, defaultId)
    
    if (!success) {
      return NextResponse.json({ ok: false, error: "Failed to save strategy map" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      uid,
      map,
      default: defaultId,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("[internal/strategy-map] PUT error:", error)
    return NextResponse.json({ ok: false, error: "Failed to save strategy map" }, { status: 500 })
  }
}
