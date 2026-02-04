/**
 * Support Tickets API
 * GET - List user's tickets
 * POST - Create new ticket or add message
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import {
  createTicket,
  addMessage,
  getTicketsForUser,
  getTicket,
} from "@/lib/user-data/support-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const { searchParams } = new URL(request.url)
  const ticketId = searchParams.get("ticketId")

  try {
    if (ticketId) {
      // Get specific ticket
      const ticket = await getTicket(ticketId)
      if (!ticket) {
        return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 })
      }
      // Security: only allow user to view their own tickets
      if (ticket.userId !== userId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.json({ ok: true, ticket })
    }

    // List all tickets for user
    const tickets = await getTicketsForUser(userId)
    return NextResponse.json({ ok: true, tickets })
  } catch (error: any) {
    console.error("[support] GET error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load tickets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const userEmail = (session.user as any).email as string
  const userName = (session.user as any).name as string | null

  try {
    const body = await request.json()
    const { action, ticketId, subject, message } = body

    if (action === "create") {
      // Create new ticket
      if (!subject?.trim() || !message?.trim()) {
        return NextResponse.json({ ok: false, error: "Subject and message required" }, { status: 400 })
      }

      const ticket = await createTicket(userId, userEmail, userName, subject.trim(), message.trim())
      return NextResponse.json({ ok: true, ticket })
    }

    if (action === "reply") {
      // Add message to existing ticket
      if (!ticketId || !message?.trim()) {
        return NextResponse.json({ ok: false, error: "Ticket ID and message required" }, { status: 400 })
      }

      // Verify user owns the ticket
      const existingTicket = await getTicket(ticketId)
      if (!existingTicket) {
        return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 })
      }
      if (existingTicket.userId !== userId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
      }

      const ticket = await addMessage(ticketId, "user", userName || userEmail, message.trim())
      return NextResponse.json({ ok: true, ticket })
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[support] POST error:", error)
    return NextResponse.json({ ok: false, error: "Failed to process request" }, { status: 500 })
  }
}
