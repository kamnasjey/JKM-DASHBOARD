/**
 * Scanner State API Routes
 *
 * GET /api/scanner-state - Get all state entries or check cooldown
 * POST /api/scanner-state - Update state after signal generation
 * DELETE /api/scanner-state - Clear all state (reset)
 *
 * Used by VPS Scanner with API key authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  checkCooldown,
  updateState,
  getAllState,
  clearAllState,
  cleanupOldState,
  batchCheckCooldowns,
  makeStateKey,
} from "@/lib/user-data/scanner-state-firestore-store"

// ============================================================
// API Key Auth
// ============================================================

const SCANNER_API_KEY = process.env.SCANNER_API_KEY

function verifyApiKey(req: NextRequest): boolean {
  if (!SCANNER_API_KEY) return false

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return false

  const token = authHeader.slice(7)
  return token === SCANNER_API_KEY
}

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // Try API key first
  if (verifyApiKey(req)) {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    if (userId) return userId
    return null
  }

  // Try NextAuth session (for dashboard frontend)
  try {
    const session = await getServerSession(authOptions)
    if (session?.user && (session.user as any).id) {
      return (session.user as any).id
    }
  } catch {
    // Session check failed, continue to Firebase token
  }

  // Try Firebase auth token
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const decoded = await verifyIdToken(token)
  return decoded?.uid || null
}

// ============================================================
// GET /api/scanner-state
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    // Check cooldown action
    if (action === "check") {
      const symbol = url.searchParams.get("symbol")
      const strategyId = url.searchParams.get("strategy_id")
      const direction = url.searchParams.get("direction") as "BUY" | "SELL"
      const cooldownMinutes = parseInt(url.searchParams.get("cooldown_minutes") || "60")

      if (!symbol || !strategyId || !direction) {
        return NextResponse.json(
          { error: "Missing required params: symbol, strategy_id, direction" },
          { status: 400 }
        )
      }

      const result = await checkCooldown(db, userId, symbol, strategyId, direction, cooldownMinutes)

      return NextResponse.json({
        ok: true,
        ...result,
        key: makeStateKey(symbol, strategyId, direction),
      })
    }

    // Default: list all state entries
    const entries = await getAllState(db, userId)

    return NextResponse.json({
      ok: true,
      entries,
      count: entries.length,
    })
  } catch (error: any) {
    console.error("[scanner-state API] GET error:", error?.message)
    return NextResponse.json(
      { error: "Failed to get scanner state" },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/scanner-state
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // Verify API key (scanner only)
    if (!verifyApiKey(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const userId = body.userId
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = getFirebaseAdminDb()

    const action = body.action

    // Batch check action
    if (action === "batch_check") {
      if (!Array.isArray(body.checks)) {
        return NextResponse.json({ error: "Missing checks array" }, { status: 400 })
      }

      const results = await batchCheckCooldowns(db, userId, body.checks)
      const resultsObj: Record<string, any> = {}
      results.forEach((value, key) => {
        resultsObj[key] = value
      })

      return NextResponse.json({
        ok: true,
        results: resultsObj,
      })
    }

    // Cleanup old state action
    if (action === "cleanup") {
      const maxAgeHours = body.maxAgeHours || 24
      const cleaned = await cleanupOldState(db, userId, maxAgeHours)

      return NextResponse.json({
        ok: true,
        cleaned,
      })
    }

    // Default: update state
    const { symbol, strategy_id, direction, signal_id } = body

    if (!symbol || !strategy_id || !direction) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, strategy_id, direction" },
        { status: 400 }
      )
    }

    const success = await updateState(db, userId, symbol, strategy_id, direction, signal_id)

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update state" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      key: makeStateKey(symbol, strategy_id, direction),
      updated_at: Math.floor(Date.now() / 1000),
    })
  } catch (error: any) {
    console.error("[scanner-state API] POST error:", error?.message)
    return NextResponse.json(
      { error: "Failed to update scanner state" },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/scanner-state
// ============================================================

export async function DELETE(req: NextRequest) {
  try {
    // Verify API key (scanner only)
    if (!verifyApiKey(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = getFirebaseAdminDb()

    const cleared = await clearAllState(db, userId)

    return NextResponse.json({
      ok: true,
      cleared,
    })
  } catch (error: any) {
    console.error("[scanner-state API] DELETE error:", error?.message)
    return NextResponse.json(
      { error: "Failed to clear scanner state" },
      { status: 500 }
    )
  }
}
