import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ 
      ok: false, 
      hasAccess: false,
      reason: "not_authenticated" 
    })
  }

  const email = (session.user as any).email
  const userId = (session.user as any).id as string | undefined

  // Owner/admin always has access
  if (isOwnerEmail(email)) {
    return NextResponse.json({
      ok: true,
      hasAccess: true,
      email,
      reason: "owner"
    })
  }

  // Check database for user access
  if (!userId) {
    return NextResponse.json({
      ok: true,
      hasAccess: false,
      email,
      reason: "no_user_id"
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasPaidAccess: true },
  })

  const hasAccess = user?.hasPaidAccess ?? false

  return NextResponse.json({
    ok: true,
    hasAccess,
    email,
    reason: hasAccess ? "approved" : "pending_approval"
  })
}
