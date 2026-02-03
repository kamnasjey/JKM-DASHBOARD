import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET /api/health
 *
 * Public health check endpoint.
 * Returns environment status without requiring authentication.
 * Does NOT crash even if dependencies are misconfigured.
 */
export async function GET() {
  const timestamp = new Date().toISOString()

  // Check NextAuth configuration
  const nextauthConfigured = Boolean(
    process.env.NEXTAUTH_URL &&
      process.env.NEXTAUTH_SECRET &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
  )

  // Check Firebase Admin configuration
  let firestoreOk = false
  let firestoreError: string | null = null
  try {
    // Dynamic import to avoid crash if not configured
    const { getFirebaseAdminDb } = await import("@/lib/firebase-admin")
    const db = getFirebaseAdminDb()
    await db.collection("users").limit(1).get()
    firestoreOk = true
  } catch (err) {
    firestoreError = err instanceof Error ? err.message : String(err)
  }

  // Check billing configuration
  const billingDisabled = process.env.BILLING_DISABLED === "1"
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)

  // Overall health
  const ok = nextauthConfigured && firestoreOk

  return NextResponse.json({
    ok,
    timestamp,
    env: {
      nextauth: {
        configured: nextauthConfigured,
        url: process.env.NEXTAUTH_URL ? "set" : "missing",
        secret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
        google: process.env.GOOGLE_CLIENT_ID ? "set" : "missing",
      },
      firestore: {
        ok: firestoreOk,
        error: firestoreError,
      },
      billing: {
        disabled: billingDisabled,
        stripeConfigured: stripeConfigured && !billingDisabled,
      },
    },
    mode: "firestore",
    note: "All data stored in Firestore. Auth: Google OAuth + Email/Password + Phone/OTP",
  })
}
