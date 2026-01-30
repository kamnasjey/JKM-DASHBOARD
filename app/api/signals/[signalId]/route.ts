/**
 * Individual Signal API Routes
 *
 * GET /api/signals/[signalId] - Get single signal
 * PATCH /api/signals/[signalId] - Update signal
 * DELETE /api/signals/[signalId] - Delete signal
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initFirebaseAdmin } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth"
import {
  getSignal,
  updateSignal,
  deleteSignal,
  type SignalUpdateInput,
} from "@/lib/user-data/signals-firestore-store"

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

  // Try Firebase auth token
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const decoded = await verifyIdToken(token)
  return decoded?.uid || null
}

// ============================================================
// GET /api/signals/[signalId]
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { signalId } = await params
    if (!signalId) {
      return NextResponse.json({ error: "Missing signalId" }, { status: 400 })
    }

    initFirebaseAdmin()
    const db = getFirestore()

    const signal = await getSignal(db, userId, signalId)

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      signal,
    })
  } catch (error: any) {
    console.error("[signals API] GET error:", error?.message)
    return NextResponse.json(
      { error: "Failed to fetch signal" },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH /api/signals/[signalId]
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { signalId } = await params
    if (!signalId) {
      return NextResponse.json({ error: "Missing signalId" }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    initFirebaseAdmin()
    const db = getFirestore()

    const updateInput: SignalUpdateInput = {}

    // Only pick allowed update fields
    if (body.status) updateInput.status = body.status
    if (body.outcome !== undefined) updateInput.outcome = body.outcome
    if (body.fill_price !== undefined) updateInput.fill_price = body.fill_price
    if (body.close_price !== undefined) updateInput.close_price = body.close_price
    if (body.closed_at !== undefined) updateInput.closed_at = body.closed_at
    if (body.pnl_pct !== undefined) updateInput.pnl_pct = body.pnl_pct
    if (body.notes !== undefined) updateInput.notes = body.notes

    const signal = await updateSignal(db, userId, signalId, updateInput)

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      signal,
    })
  } catch (error: any) {
    console.error("[signals API] PATCH error:", error?.message)
    return NextResponse.json(
      { error: "Failed to update signal" },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/signals/[signalId]
// ============================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { signalId } = await params
    if (!signalId) {
      return NextResponse.json({ error: "Missing signalId" }, { status: 400 })
    }

    initFirebaseAdmin()
    const db = getFirestore()

    const deleted = await deleteSignal(db, userId, signalId)

    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deleted: signalId,
    })
  } catch (error: any) {
    console.error("[signals API] DELETE error:", error?.message)
    return NextResponse.json(
      { error: "Failed to delete signal" },
      { status: 500 }
    )
  }
}
