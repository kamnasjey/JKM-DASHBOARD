import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET /api/auth/mode
 *
 * Returns the current auth mode configuration.
 * All auth methods now use Firestore - all methods always available.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    // All methods now use Firestore - always available
    google: true,
    email: true,
    phone: true,
    mode: "full",
    message: "All login methods available",
  })
}
