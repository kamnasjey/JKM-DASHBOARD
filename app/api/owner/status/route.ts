import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import { json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return json(200, { ok: true, isOwner: false })

  const email = (session.user as any).email
  return json(200, { ok: true, isOwner: isOwnerEmail(email) })
}
