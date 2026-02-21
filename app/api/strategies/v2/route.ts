import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { randomUUID } from "crypto"
import {
  listStrategies,
  createStrategy,
  MAX_STRATEGIES_PER_USER,
} from "@/lib/user-data/strategies-firestore-store"
import {
  validateCreateStrategy,
  formatZodErrors,
} from "@/lib/schemas/strategy"
import { validateStrategy } from "@/lib/strategies/strategy-validator"
import { isValidInternalKey } from "@/lib/internal-api-auth"

export const runtime = "nodejs"

/**
 * Dual-auth helper: returns userId if authenticated via session OR internal key.
 * 
 * Priority:
 * 1. NextAuth session (browser users)
 * 2. Internal API key + query param user_id (service calls)
 * 
 * @returns { ok: true, userId, mode } or { ok: false, status, error }
 */
async function resolveAuth(request: NextRequest): Promise<
  | { ok: true; userId: string; mode: "session" | "internal" }
  | { ok: false; status: number; error: string }
> {
  // Try NextAuth session first (browser users)
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const userId = (session.user as any).id
    if (userId) {
      return { ok: true, userId, mode: "session" }
    }
  }

  // Try internal API key (service-to-service)
  if (isValidInternalKey(request)) {
    // For internal calls, user_id must be provided as query param
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    if (userId && userId !== "undefined" && userId !== "null") {
      return { ok: true, userId, mode: "internal" }
    }
    // Internal key valid but no user_id - still allow if just checking auth
    return { ok: false, status: 400, error: "MISSING_USER_ID" }
  }

  return { ok: false, status: 401, error: "UNAUTHENTICATED" }
}

/**
 * GET /api/strategies/v2
 * 
 * List user's strategies (newest first, max 50)
 * 
 * Auth: NextAuth session OR x-internal-api-key header
 * 
 * Query params:
 *   - limit: number (default 50, max 100)
 *   - cursor: string (for pagination)
 *   - user_id: string (required for internal key auth)
 */
export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const auth = await resolveAuth(request)
    
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      )
    }
    
    const userId = auth.userId
    
    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10) || 50,
      100
    )
    const cursor = searchParams.get("cursor") || undefined
    
    const result = await listStrategies(userId, { limit, cursor })

    // Debug: log strategy IDs being returned
    console.log(`[${requestId}] Returning ${result.strategies.length} strategies:`,
      result.strategies.map(s => ({ id: s.id, name: s.name }))
    )

    return NextResponse.json({
      ok: true,
      strategies: result.strategies,
      count: result.strategies.length,
      nextCursor: result.nextCursor,
      maxAllowed: MAX_STRATEGIES_PER_USER,
    })
    
  } catch (error: any) {
    // Graceful handling for Firestore NOT_FOUND (new user, no doc yet)
    const errCode = error?.code || ""
    const errMsg = (error?.message || "").toLowerCase()
    
    if (
      errCode === 5 || 
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") || 
      errMsg.includes("not found") || 
      errMsg.includes("no document")
    ) {
      console.log(`[${requestId}] First-time user, returning empty strategies`)
      return NextResponse.json({
        ok: true,
        strategies: [],
        count: 0,
        nextCursor: null,
        maxAllowed: MAX_STRATEGIES_PER_USER,
      })
    }

    console.error(`[${requestId}] GET /api/strategies error:`, error?.message || error)
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: error?.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategies/v2
 * 
 * Create a new strategy
 * 
 * Auth: NextAuth session OR x-internal-api-key header
 * 
 * Body:
 *   - name: string (required)
 *   - description?: string
 *   - enabled?: boolean (default true)
 *   - detectors: string[] (required, min 1)
 *   - symbols?: string[]
 *   - timeframe?: string
 *   - config?: object
 * 
 * Query params (for internal key auth):
 *   - user_id: string (required)
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const auth = await resolveAuth(request)
    
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      )
    }
    
    const userId = auth.userId
    
    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      )
    }
    
    // Validate (structural - Zod)
    const zodResult = validateCreateStrategy(body)
    if (!zodResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          details: formatZodErrors(zodResult.error),
        },
        { status: 422 }
      )
    }

    // Validate (semantic - strategy health)
    const { detectors, entry_tf, trend_tf, config, name } = zodResult.data
    const semanticValidation = validateStrategy({
      name,
      detectors,
      entry_tf: entry_tf ?? null,
      trend_tf: trend_tf ?? null,
      config: config ?? null,
    })

    if (!semanticValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "STRATEGY_VALIDATION_ERROR",
          errors: semanticValidation.errors,
          warnings: semanticValidation.warnings,
          healthScore: semanticValidation.healthScore,
          healthGrade: semanticValidation.healthGrade,
        },
        { status: 422 }
      )
    }

    // Create
    const strategy = await createStrategy(userId, zodResult.data)

    console.log(`[${requestId}] Created strategy ${strategy.id} for user ${userId} (health: ${semanticValidation.healthScore})`)

    return NextResponse.json({
      ok: true,
      strategy,
      validation: {
        warnings: semanticValidation.warnings,
        healthScore: semanticValidation.healthScore,
        healthGrade: semanticValidation.healthGrade,
        healthBreakdown: semanticValidation.healthBreakdown,
      },
    }, { status: 201 })
    
  } catch (error: any) {
    console.error(`[${requestId}] POST /api/strategies error:`, error?.message || error)
    
    // Handle limit exceeded - use LIMIT_REACHED for consistency
    if (error?.message?.includes("Maximum") || error?.message?.includes("limit")) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "LIMIT_REACHED", 
          message: error.message,
          limit: MAX_STRATEGIES_PER_USER,
        },
        { status: 400 }
      )
    }
    
    // Graceful handling for Firestore NOT_FOUND (new user, first strategy)
    const errCode = error?.code || ""
    const errMsg = (error?.message || "").toLowerCase()
    
    if (
      errCode === 5 || 
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") || 
      errMsg.includes("not found")
    ) {
      // Try again - the createStrategy should handle this, but just in case
      console.log(`[${requestId}] NOT_FOUND during create - this shouldn't happen with merge:true`)
    }
    
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: error?.message },
      { status: 500 }
    )
  }
}
