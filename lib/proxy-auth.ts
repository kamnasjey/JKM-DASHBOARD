import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/lib/nextauth"

export async function requireSession() {
  const session = await getServerSession(getAuthOptions())
  if (!session) {
    return null
  }
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
