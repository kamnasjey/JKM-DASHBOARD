import { NextResponse } from "next/server"
import { prismaAvailable } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/auth/mode
 * 
 * Returns the current auth mode configuration.
 * This helps the UI decide which login methods to enable.
 */
export async function GET() {
  const hasPrisma = prismaAvailable()
  
  return NextResponse.json({
    ok: true,
    // Google OAuth always available
    google: true,
    // Email/Password requires Prisma
    email: hasPrisma,
    // Phone/OTP requires Prisma
    phone: hasPrisma,
    // Mode description
    mode: hasPrisma ? "full" : "google-only",
    message: hasPrisma 
      ? "All login methods available"
      : "Email/Phone login disabled. Use Google to sign in.",
  })
}
