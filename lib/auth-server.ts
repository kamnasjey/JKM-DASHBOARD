import { auth } from "@/lib/auth"

export async function getSession() {
  return await auth()
}

export async function requireAuth() {
  const session = await auth()
  if (!session || !session.user) {
    return null
  }
  return session
}
