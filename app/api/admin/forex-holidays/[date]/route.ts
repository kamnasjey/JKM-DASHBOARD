import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { forwardInternalRequest } from "@/lib/backend-proxy"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// DELETE - Remove a forex holiday by date
export async function DELETE(
  request: Request,
  { params }: { params: { date: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const { date } = params

  return forwardInternalRequest(request, {
    method: "DELETE",
    path: `/api/admin/forex-holidays/${date}`,
  })
}
