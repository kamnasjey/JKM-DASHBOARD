import { getServerSession } from "next-auth"

export async function getSession() {
  return await getServerSession()
}

export async function requireAuth() {
  const session = await getSession()
  if (!session || !session.user) {
    return null
  }
  return session
}
