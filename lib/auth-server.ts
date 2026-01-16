import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session || !session.user) {
    return null
  }
  return session
}

/**
 * Get the authenticated user's ID from the session.
 * 
 * This is the canonical way to get userId across all API routes.
 * The ID comes from:
 * 1. Prisma user.id (if Prisma is configured)
 * 2. Google OAuth providerAccountId (if Prisma is not configured)
 * 
 * @returns userId string or null if not authenticated
 */
export async function requireUserIdFromSession(): Promise<string | null> {
  const session = await getSession()
  if (!session?.user) {
    return null
  }
  
  // userId is stored in session.user.id by auth-options callbacks
  const userId = (session.user as any).id
  if (!userId) {
    console.warn("[auth-server] Session exists but user.id is missing")
    return null
  }
  
  return String(userId)
}
