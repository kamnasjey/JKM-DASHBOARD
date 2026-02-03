import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/health
 *
 * Health check for Firestore connectivity.
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const startedAt = Date.now()

  // Check Firestore (canonical user store)
  let firestoreOk = false
  let firestoreError: string | null = null
  try {
    const db = getFirebaseAdminDb()
    // Minimal Firestore connectivity check
    await db.collection("users").limit(1).get()
    firestoreOk = true
  } catch (err: unknown) {
    firestoreOk = false
    firestoreError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({
    ok: firestoreOk,
    checks: {
      firestore: { ok: firestoreOk, error: firestoreError, required: true },
    },
    ms: Date.now() - startedAt,
    mode: "firestore",
    note: "All data stored in Firestore",
  })
}
