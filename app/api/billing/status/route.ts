import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string | undefined
    if (!userId) {
      // For OAuth users without DB record, default to unpaid
      return NextResponse.json({ ok: true, hasPaidAccess: false, paidAt: null })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hasPaidAccess: true, paidAt: true },
    })

    if (!user) {
      // User not in DB yet, default to unpaid
      return NextResponse.json({ ok: true, hasPaidAccess: false, paidAt: null })
    }

    return NextResponse.json({ ok: true, ...user })
  } catch (err: any) {
    console.error("[billing/status] Error:", err)
    // Return safe default instead of 500
    return NextResponse.json({ ok: true, hasPaidAccess: false, paidAt: null, error: "DB unavailable" })
  }
}
