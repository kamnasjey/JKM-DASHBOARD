import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { forwardInternalRequest } from "@/lib/backend-proxy"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET - List all forex holidays
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  return forwardInternalRequest(request, {
    method: "GET",
    path: "/api/admin/forex-holidays",
  })
}

// POST - Add a new forex holiday
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const body = await request.text()

  return forwardInternalRequest(request, {
    method: "POST",
    path: "/api/admin/forex-holidays",
    body,
  })
}
