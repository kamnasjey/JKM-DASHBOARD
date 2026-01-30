/**
 * Signals API Routes
 *
 * GET /api/signals - List signals (requires auth or API key)
 * POST /api/signals - Create signal (requires API key for scanner)
 *
 * Used by:
 * - Dashboard frontend (via user auth)
 * - VPS Scanner (via API key)
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  createSignal,
  querySignals,
  batchCreateSignals,
  type SignalCreateInput,
  type SignalQueryOptions,
} from "@/lib/user-data/signals-firestore-store"

// ============================================================
// API Key Auth (for VPS Scanner)
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
  // Try API key first (for scanner)
  if (verifyApiKey(req)) {
    // For scanner, userId comes from query or body
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
// GET /api/signals
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Parse query params
    const url = new URL(req.url)
    const options: SignalQueryOptions = {
      symbol: url.searchParams.get("symbol") || undefined,
      strategy_id: url.searchParams.get("strategy_id") || undefined,
      status: (url.searchParams.get("status") as any) || undefined,
      limit: parseInt(url.searchParams.get("limit") || "50"),
      orderBy: "created_at",
      orderDir: "desc",
    }

    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    if (startDate) options.startDate = parseInt(startDate)
    if (endDate) options.endDate = parseInt(endDate)

    const signals = await querySignals(db, userId, options)

    return NextResponse.json({
      ok: true,
      signals,
      count: signals.length,
    })
  } catch (error: any) {
    console.error("[signals API] GET error:", error?.message)
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/signals
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // Must have API key or auth
    const userId = await getUserIdFromRequest(req)

    // For scanner, userId might be in body
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const targetUserId = userId || body.userId
    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify API key for scanner requests
    const hasApiKey = verifyApiKey(req)
    if (!userId && !hasApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Check if batch create
    if (Array.isArray(body.signals)) {
      // Batch create
      const result = await batchCreateSignals(db, targetUserId, body.signals)
      return NextResponse.json({
        ok: true,
        ...result,
      })
    }

    // Single create
    const signalInput: SignalCreateInput = {
      signal_id: body.signal_id,
      symbol: body.symbol,
      timeframe: body.timeframe,
      direction: body.direction,
      entry: body.entry,
      sl: body.sl,
      tp: body.tp,
      rr: body.rr,
      strategy_id: body.strategy_id,
      strategy_name: body.strategy_name,
      detectors: body.detectors,
      created_at: body.created_at,
      status: body.status,
      source: body.source || "scanner",
    }

    if (!signalInput.signal_id || !signalInput.symbol || !signalInput.entry) {
      return NextResponse.json(
        { error: "Missing required fields: signal_id, symbol, entry" },
        { status: 400 }
      )
    }

    const signal = await createSignal(db, targetUserId, signalInput)

    if (!signal) {
      return NextResponse.json(
        { error: "Failed to create signal" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      signal,
    })
  } catch (error: any) {
    console.error("[signals API] POST error:", error?.message)
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    )
  }
}
