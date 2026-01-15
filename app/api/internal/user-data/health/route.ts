import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { getPrisma, prismaAvailable, getPrismaInitError } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/internal/user-data/health
 * 
 * Health check for Firestore and Prisma connectivity.
 * 
 * Query params:
 *   - skip_prisma: "false" to explicitly check Prisma (default is TRUE for Path-2 mode)
 */
export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  // Default: skip_prisma=true (Path-2 mode: Firestore-only)
  const skipPrisma = searchParams.get("skip_prisma") !== "false"

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

  // Check Prisma (optional, for auth/billing)
  let prismaOk = false
  let prismaError: string | null = null
  let prismaSkipped = false
  let prismaDisabled = false

  if (!prismaAvailable()) {
    // Prisma not initialized (DATABASE_URL missing or init failed)
    prismaDisabled = true
    prismaSkipped = true
    prismaOk = true // Treat as OK since it's intentionally disabled
    const initErr = getPrismaInitError()
    prismaError = initErr ? initErr.message : "Prisma not initialized (DATABASE_URL missing)"
  } else if (skipPrisma) {
    prismaSkipped = true
    prismaOk = true // Treat as OK if skipped
  } else {
    const prisma = getPrisma()
    if (!prisma) {
      prismaOk = false
      prismaError = "Prisma client not available"
    } else {
      try {
        await prisma.user.count()
        prismaOk = true
      } catch (err: unknown) {
        prismaOk = false
        prismaError = err instanceof Error ? err.message : String(err)
      }
    }
  }

  // Overall health: Firestore is required, Prisma is optional if skipped/disabled
  const overallOk = firestoreOk && (prismaSkipped || prismaOk)

  return NextResponse.json({
    ok: overallOk,
    checks: {
      firestore: { ok: firestoreOk, error: firestoreError, required: true },
      prisma: { 
        ok: prismaOk, 
        error: prismaError, 
        skipped: prismaSkipped, 
        disabled: prismaDisabled,
        required: !skipPrisma && !prismaDisabled,
      },
    },
    ms: Date.now() - startedAt,
    mode: prismaDisabled ? "firestore-only" : "full",
    note: prismaDisabled 
      ? "Running in Firestore-only mode (DATABASE_URL not set). Auth uses Google OAuth only."
      : "Firestore is the canonical user data store. Prisma is used for auth/billing.",
  })
}
