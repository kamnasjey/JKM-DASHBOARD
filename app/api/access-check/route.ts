import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isAllowedEmail } from "@/lib/access-control"
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
  const hasAccess = isAllowedEmail(email)

  return NextResponse.json({
    ok: true,
    hasAccess,
    email,
    reason: hasAccess ? "allowed" : "not_in_access_list"
  })
}
