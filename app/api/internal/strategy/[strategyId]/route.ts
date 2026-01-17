/**
 * GET /api/internal/strategy/[strategyId]
 * 
 * Fetch a single strategy by its Firestore document ID.
 * Used by backend scanner to load strategy config.
 * 
 * Requires: x-internal-api-key header
 * 
 * Query params:
 *   - user_id: (optional) User ID if known
 * 
 * Response:
 * {
 *   "ok": true,
 *   "strategy": {
 *     "id": "...",
 *     "name": "...",
 *     "detectors": [...],
 *     "gates": [...],
 *     "triggers": [...],
 *     "confluence": [...],
 *     "risk": {...},
 *     "config": {...}
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  // Verify internal API key
  const auth = requireInternalApiKey(request)
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: auth.message },
      { status: auth.status }
    )
  }

  const { strategyId } = await params
  
  if (!strategyId || strategyId === "undefined") {
    return NextResponse.json(
      { ok: false, error: "INVALID_STRATEGY_ID", message: "Missing strategyId" },
      { status: 400 }
    )
  }

  // Optional: user_id can be passed to narrow search
  const userId = request.nextUrl.searchParams.get("user_id")

  try {
    const db = getFirebaseAdminDb()
    
    let strategyDoc: FirebaseFirestore.DocumentSnapshot | null = null
    let foundUserId: string | null = null

    if (userId) {
      // Direct lookup if user_id provided
      const ref = db.collection("users").doc(userId).collection("strategies").doc(strategyId)
      const doc = await ref.get()
      if (doc.exists) {
        strategyDoc = doc
        foundUserId = userId
      }
    } else {
      // Without user_id, we need to search across all users
      // Since collectionGroup with __name__ filter requires full path,
      // we iterate through users and check their strategies
      const usersSnapshot = await db.collection("users").listDocuments()
      
      for (const userRef of usersSnapshot) {
        const stratRef = userRef.collection("strategies").doc(strategyId)
        const doc = await stratRef.get()
        if (doc.exists) {
          strategyDoc = doc
          foundUserId = userRef.id
          break
        }
      }
    }

    if (!strategyDoc || !strategyDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: `Strategy ${strategyId} not found` },
        { status: 404 }
      )
    }

    const data = strategyDoc.data()
    
    // Build normalized response
    const strategy = {
      id: strategyDoc.id,
      userId: foundUserId,
      name: data?.name || `Strategy ${strategyDoc.id.slice(0, 8)}`,
      enabled: data?.enabled ?? true,
      
      // Detector arrays (V2 format preferred)
      detectors: data?.detectors || [],
      detectorIds: data?.detectorIds || [], // Legacy
      
      // Legacy category arrays
      gates: data?.gates || [],
      triggers: data?.triggers || [],
      confirms: data?.confirms || [],
      confluence: data?.confluence || [],
      
      // Risk/config
      risk: data?.risk || {},
      config: data?.config || {},
      
      // Metadata
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
      
      // Include any other fields
      ...Object.fromEntries(
        Object.entries(data || {}).filter(([k]) => 
          !["name", "enabled", "detectors", "detectorIds", "gates", "triggers", 
            "confirms", "confluence", "risk", "config", "createdAt", "updatedAt"].includes(k)
        )
      ),
    }

    return NextResponse.json({
      ok: true,
      strategy,
    })

  } catch (err: any) {
    console.error(`[internal strategy GET] Error fetching ${strategyId}:`, err)
    
    return NextResponse.json(
      { 
        ok: false, 
        error: "INTERNAL_ERROR", 
        message: err.message || "Failed to fetch strategy",
      },
      { status: 500 }
    )
  }
}
