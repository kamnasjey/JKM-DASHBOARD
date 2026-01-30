/**
 * Internal Scanner State API
 *
 * GET /api/internal/user-data/scanner-state - Check cooldown or list state
 * POST /api/internal/user-data/scanner-state - Update state after signal
 * DELETE /api/internal/user-data/scanner-state - Clear all state
 *
 * Used by VPS Scanner with x-internal-api-key authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import {
  checkCooldown,
  updateState,
  getAllState,
  clearAllState,
  cleanupOldState,
  batchCheckCooldowns,
  makeStateKey,
} from "@/lib/user-data/scanner-state-firestore-store"

export const runtime = "nodejs"

// ============================================================
// GET /api/internal/user-data/scanner-state
// ============================================================

export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")?.trim()

  if (!userId) {
    return NextResponse.json({ ok: false, message: "user_id query param required" }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const action = searchParams.get("action")

  try {
    // Check cooldown action
    if (action === "check") {
      const symbol = searchParams.get("symbol")?.trim()
      const strategyId = searchParams.get("strategy_id")?.trim()
      const direction = searchParams.get("direction") as "BUY" | "SELL"
      const cooldownMinutes = parseInt(searchParams.get("cooldown_minutes") || "60")

      if (!symbol || !strategyId || !direction) {
        return NextResponse.json(
          { ok: false, message: "Missing required params: symbol, strategy_id, direction" },
          { status: 400 }
        )
      }

      const result = await checkCooldown(db, userId, symbol, strategyId, direction, cooldownMinutes)

      return NextResponse.json({
        ok: true,
        user_id: userId,
        ...result,
        key: makeStateKey(symbol, strategyId, direction),
      })
    }

    // Default: list all state entries
    const entries = await getAllState(db, userId)

    return NextResponse.json({
      ok: true,
      user_id: userId,
      entries,
      count: entries.length,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed to get scanner state: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/internal/user-data/scanner-state
// ============================================================

export async function POST(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const userId = String(body.user_id || "").trim()
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Missing user_id" }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const action = body.action

  try {
    // Batch check cooldowns
    if (action === "batch_check") {
      if (!Array.isArray(body.checks)) {
        return NextResponse.json({ ok: false, message: "Missing checks array" }, { status: 400 })
      }

      const results = await batchCheckCooldowns(db, userId, body.checks)
      const resultsObj: Record<string, any> = {}
      results.forEach((value, key) => {
        resultsObj[key] = value
      })

      return NextResponse.json({
        ok: true,
        user_id: userId,
        results: resultsObj,
      })
    }

    // Cleanup old state
    if (action === "cleanup") {
      const maxAgeHours = Number(body.maxAgeHours) || 24
      const cleaned = await cleanupOldState(db, userId, maxAgeHours)

      return NextResponse.json({
        ok: true,
        user_id: userId,
        cleaned,
      })
    }

    // Default: update state after signal generation
    const symbol = String(body.symbol || "").trim()
    const strategyId = String(body.strategy_id || "").trim()
    const direction = String(body.direction || "").trim() as "BUY" | "SELL"
    const signalId = body.signal_id ? String(body.signal_id).trim() : undefined

    if (!symbol || !strategyId || !direction) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields: symbol, strategy_id, direction" },
        { status: 400 }
      )
    }

    const success = await updateState(db, userId, symbol, strategyId, direction, signalId)

    if (!success) {
      return NextResponse.json({ ok: false, message: "Failed to update state" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      key: makeStateKey(symbol, strategyId, direction),
      updated_at: Math.floor(Date.now() / 1000),
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed to update scanner state: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/internal/user-data/scanner-state
// ============================================================

export async function DELETE(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")?.trim()

  if (!userId) {
    return NextResponse.json({ ok: false, message: "user_id query param required" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()
    const cleared = await clearAllState(db, userId)

    return NextResponse.json({
      ok: true,
      user_id: userId,
      cleared,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, message: `Failed to clear scanner state: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
