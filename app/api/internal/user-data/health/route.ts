import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  const startedAt = Date.now()

  let firestoreOk = false
  let firestoreError: string | null = null
  try {
    const db = getFirebaseAdminDb()
    // Minimal Firestore connectivity check
    await db.collection("users").limit(1).get()
    firestoreOk = true
  } catch (err: any) {
    firestoreOk = false
    firestoreError = err?.message || String(err)
  }

  let prismaOk = false
  let prismaError: string | null = null
  try {
    await prisma.user.count()
    prismaOk = true
  } catch (err: any) {
    prismaOk = false
    prismaError = err?.message || String(err)
  }

  return NextResponse.json({
    ok: firestoreOk && prismaOk,
    checks: {
      firestore: { ok: firestoreOk, error: firestoreError },
      prisma: { ok: prismaOk, error: prismaError },
    },
    ms: Date.now() - startedAt,
  })
}
