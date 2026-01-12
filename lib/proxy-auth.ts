import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/db"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return null
  }
  return session
}

export async function requirePaidSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const userId = (session.user as any).id as string | undefined
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasPaidAccess: true },
  })

  if (!user?.hasPaidAccess) return null
  return session
}

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}
