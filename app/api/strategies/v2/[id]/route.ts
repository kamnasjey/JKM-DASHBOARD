import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { randomUUID } from "crypto"
import {
  getStrategy,
  updateStrategy,
  deleteStrategy,
} from "@/lib/user-data/strategies-firestore-store"
import {
  validateUpdateStrategy,
  formatZodErrors,
} from "@/lib/schemas/strategy"

export const runtime = "nodejs"

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/strategies/v2/[id]
 * 
 * Get a single strategy by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = randomUUID()
  const { id: strategyId } = await params
  
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
    
    const strategy = await getStrategy(userId, strategyId)
    
    if (!strategy) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ok: true,
      strategy,
    })
    
  } catch (error: any) {
    console.error(`[${requestId}] GET /api/strategies/v2/${strategyId} error:`, error?.message || error)
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: error?.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/strategies/v2/[id]
 * 
 * Update a strategy (partial update)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = randomUUID()
  const { id: strategyId } = await params
  
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
    const validation = validateUpdateStrategy(body)
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
    
    // Check at least one field is being updated
    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        { ok: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      )
    }
    
    // Update
    const strategy = await updateStrategy(userId, strategyId, validation.data)
    
    console.log(`[${requestId}] Updated strategy ${strategyId} for user ${userId}`)
    
    return NextResponse.json({
      ok: true,
      strategy,
    })
    
  } catch (error: any) {
    console.error(`[${requestId}] PATCH /api/strategies/v2/${strategyId} error:`, error?.message || error)
    
    if (error?.message === "Strategy not found") {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: error?.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/strategies/v2/[id]
 * 
 * Delete a strategy
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = randomUUID()
  const { id: strategyId } = await params
  
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
    
    await deleteStrategy(userId, strategyId)
    
    console.log(`[${requestId}] Deleted strategy ${strategyId} for user ${userId}`)
    
    return NextResponse.json({
      ok: true,
      deleted: true,
    })
    
  } catch (error: any) {
    console.error(`[${requestId}] DELETE /api/strategies/v2/${strategyId} error:`, error?.message || error)
    
    if (error?.message === "Strategy not found") {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: error?.message },
      { status: 500 }
    )
  }
}
