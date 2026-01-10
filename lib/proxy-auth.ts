import { auth } from "@/lib/auth"

export async function requireSession() {
  const session = await auth()
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
