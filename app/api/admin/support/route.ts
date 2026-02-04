/**
 * Admin Support Tickets API
 * GET - List all tickets (admin only)
 * POST - Reply to ticket or update status (admin only)
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import {
  getAllTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  getOpenTicketsCount,
} from "@/lib/user-data/support-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userEmail = (session.user as any).email as string
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as "open" | "replied" | "closed" | null
  const ticketId = searchParams.get("ticketId")

  try {
    if (ticketId) {
      const ticket = await getTicket(ticketId)
      if (!ticket) {
        return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 })
      }
      return NextResponse.json({ ok: true, ticket })
    }

    const tickets = await getAllTickets(status || undefined, 100)
    const openCount = await getOpenTicketsCount()

    return NextResponse.json({
      ok: true,
      tickets,
      openCount,
    })
  } catch (error: any) {
    console.error("[admin/support] GET error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load tickets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const userEmail = (session.user as any).email as string
  const userName = (session.user as any).name as string | null
  if (!isOwnerEmail(userEmail)) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, ticketId, message, status } = body

    if (!ticketId) {
      return NextResponse.json({ ok: false, error: "Ticket ID required" }, { status: 400 })
    }

    if (action === "reply") {
      if (!message?.trim()) {
        return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 })
      }

      const adminName = userName || "Admin"
      const ticket = await addMessage(ticketId, "admin", adminName, message.trim())
      if (!ticket) {
        return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 })
      }

      return NextResponse.json({ ok: true, ticket })
    }

    if (action === "updateStatus") {
      if (!["open", "replied", "closed"].includes(status)) {
        return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 })
      }

      await updateTicketStatus(ticketId, status)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[admin/support] POST error:", error)
    return NextResponse.json({ ok: false, error: "Failed to process request" }, { status: 500 })
  }
}
