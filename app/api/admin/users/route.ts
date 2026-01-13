import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET - List all users
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      provider: true,
      hasPaidAccess: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ ok: true, users })
}

// POST - Update user access
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const email = (session.user as any).email
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ ok: false, message: "Admin only" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, hasAccess } = body

  if (!userId) {
    return NextResponse.json({ ok: false, message: "userId required" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { hasPaidAccess: Boolean(hasAccess) },
  })

  return NextResponse.json({ ok: true, message: hasAccess ? "Access granted" : "Access revoked" })
}
