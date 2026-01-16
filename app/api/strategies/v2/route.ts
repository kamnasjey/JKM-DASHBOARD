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

export const runtime = "nodejs"

/**
 * GET /api/strategies
 * 
 * List user's strategies (newest first, max 50)
 * 
 * Query params:
 *   - limit: number (default 50, max 100)
 *   - cursor: string (for pagination)
 */
export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      )
    }
    
    const userId = (session.user as any).id
    if (!userId) {
      console.error(`[${requestId}] No user ID in session`)
      return NextResponse.json(
        { ok: false, error: "INVALID_SESSION" },
        { status: 401 }
      )
    }
    
    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10) || 50,
      100
    )
    const cursor = searchParams.get("cursor") || undefined
    
    const result = await listStrategies(userId, { limit, cursor })
    
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
 * POST /api/strategies
 * 
 * Create a new strategy
 * 
 * Body:
 *   - name: string (required)
 *   - description?: string
 *   - enabled?: boolean (default true)
 *   - detectors: string[] (required, min 1)
 *   - symbols?: string[]
 *   - timeframe?: string
 *   - config?: object
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      )
    }
    
    const userId = (session.user as any).id
    if (!userId) {
      console.error(`[${requestId}] No user ID in session`)
      return NextResponse.json(
        { ok: false, error: "INVALID_SESSION" },
        { status: 401 }
      )
    }
    
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
    
    // Validate
    const validation = validateCreateStrategy(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          details: formatZodErrors(validation.error),
        },
        { status: 422 }
      )
    }
    
    // Create
    const strategy = await createStrategy(userId, validation.data)
    
    console.log(`[${requestId}] Created strategy ${strategy.id} for user ${userId}`)
    
    return NextResponse.json({
      ok: true,
      strategy,
    }, { status: 201 })
    
  } catch (error: any) {
    console.error(`[${requestId}] POST /api/strategies error:`, error?.message || error)
    
    // Handle limit exceeded
    if (error?.message?.includes("Maximum")) {
      return NextResponse.json(
        { ok: false, error: "LIMIT_EXCEEDED", message: error.message },
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
