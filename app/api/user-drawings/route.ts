import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  listDrawings,
  createDrawing,
  clearDrawings,
  MAX_DRAWINGS_PER_USER,
  MAX_DRAWINGS_PER_CHART,
} from "@/lib/user-data/drawings-firestore-store"
import {
  validateCreateDrawing,
  formatZodErrors,
} from "@/lib/schemas/drawing"

export const runtime = "nodejs"

/**
 * GET /api/user-drawings
 *
 * List user's drawings for a specific symbol/timeframe
 *
 * Query params:
 *   - symbol: string (required)
 *   - timeframe: string (default "M5")
 *   - limit: number (default 100, max 200)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim()
  const timeframe = searchParams.get("timeframe")?.trim() || "M5"
  const limitStr = searchParams.get("limit")

  if (!symbol) {
    return NextResponse.json(
      { ok: false, error: "symbol parameter is required" },
      { status: 400 }
    )
  }

  let limit = limitStr ? parseInt(limitStr, 10) : 100
  if (isNaN(limit) || limit < 1) limit = 100
  if (limit > 200) limit = 200

  try {
    const drawings = await listDrawings(userId, { symbol, timeframe, limit })

    return NextResponse.json({
      ok: true,
      drawings,
      count: drawings.length,
      maxPerChart: MAX_DRAWINGS_PER_CHART,
      maxTotal: MAX_DRAWINGS_PER_USER,
    })
  } catch (err: any) {
    console.error("[user-drawings] GET error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "Failed to list drawings" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user-drawings
 *
 * Create a new drawing
 *
 * Body: CreateDrawingInput (see lib/schemas/drawing.ts)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const validation = validateCreateDrawing(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation error",
        details: formatZodErrors(validation.error),
      },
      { status: 422 }
    )
  }

  try {
    const drawing = await createDrawing(userId, validation.data)

    return NextResponse.json(
      { ok: true, drawing },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[user-drawings] POST error:", err?.message || err)

    // Handle limit exceeded
    if (err?.message?.includes("Maximum")) {
      return NextResponse.json(
        { ok: false, error: "LIMIT_REACHED", message: err.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create drawing" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user-drawings
 *
 * Clear all drawings for a symbol/timeframe
 *
 * Query params:
 *   - symbol: string (required)
 *   - timeframe: string (required)
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim()
  const timeframe = searchParams.get("timeframe")?.trim()

  if (!symbol || !timeframe) {
    return NextResponse.json(
      { ok: false, error: "symbol and timeframe parameters are required" },
      { status: 400 }
    )
  }

  try {
    const deletedCount = await clearDrawings(userId, symbol, timeframe)

    return NextResponse.json({
      ok: true,
      deletedCount,
    })
  } catch (err: any) {
    console.error("[user-drawings] DELETE error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "Failed to clear drawings" },
      { status: 500 }
    )
  }
}
