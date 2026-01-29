import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  getDrawing,
  updateDrawing,
  deleteDrawing,
} from "@/lib/user-data/drawings-firestore-store"
import {
  validateUpdateDrawing,
  formatZodErrors,
} from "@/lib/schemas/drawing"

export const runtime = "nodejs"

/**
 * GET /api/user-drawings/[drawingId]
 *
 * Get a single drawing by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ drawingId: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { drawingId } = await params

  if (!drawingId) {
    return NextResponse.json(
      { ok: false, error: "drawingId is required" },
      { status: 400 }
    )
  }

  try {
    const drawing = await getDrawing(userId, drawingId)

    if (!drawing) {
      return NextResponse.json(
        { ok: false, error: "Drawing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, drawing })
  } catch (err: any) {
    console.error("[user-drawings] GET by ID error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "Failed to get drawing" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user-drawings/[drawingId]
 *
 * Update a drawing
 *
 * Body: UpdateDrawingInput (partial)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ drawingId: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { drawingId } = await params

  if (!drawingId) {
    return NextResponse.json(
      { ok: false, error: "drawingId is required" },
      { status: 400 }
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

  const validation = validateUpdateDrawing(body)
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
    const drawing = await updateDrawing(userId, drawingId, validation.data)

    return NextResponse.json({ ok: true, drawing })
  } catch (err: any) {
    console.error("[user-drawings] PATCH error:", err?.message || err)

    if (err?.message === "Drawing not found") {
      return NextResponse.json(
        { ok: false, error: "Drawing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { ok: false, error: "Failed to update drawing" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user-drawings/[drawingId]
 *
 * Delete a single drawing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ drawingId: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { drawingId } = await params

  if (!drawingId) {
    return NextResponse.json(
      { ok: false, error: "drawingId is required" },
      { status: 400 }
    )
  }

  try {
    await deleteDrawing(userId, drawingId)

    return NextResponse.json({ ok: true, deleted: drawingId })
  } catch (err: any) {
    console.error("[user-drawings] DELETE error:", err?.message || err)

    if (err?.message === "Drawing not found") {
      return NextResponse.json(
        { ok: false, error: "Drawing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { ok: false, error: "Failed to delete drawing" },
      { status: 500 }
    )
  }
}
