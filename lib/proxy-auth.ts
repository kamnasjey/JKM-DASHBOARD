import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { prisma, isPrismaAvailable } from "@/lib/db"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return null
  }
  return session
}

export async function requireAllowedSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const email = (session.user as any).email
  
  // Owner/admin always has access
  if (isOwnerEmail(email)) return session

  // Check database for user access (if Prisma available)
  const userId = (session.user as any).id as string | undefined
  if (!userId) return null

  // If Prisma is not available, allow access by default (Firestore-only mode)
  // In production with full features, you should have Prisma enabled
  if (!isPrismaAvailable() || !prisma) {
    console.warn("[proxy-auth] Prisma disabled - allowing session without paid access check")
    return session
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasPaidAccess: true },
  })

  if (!user?.hasPaidAccess) return null
  return session
}

// Legacy alias - now just checks allowed access instead of paid
export async function requirePaidSession() {
  return requireAllowedSession()
}

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}
