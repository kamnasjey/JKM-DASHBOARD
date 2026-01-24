import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getAllDiagnostics, getLastDiagnostics } from "@/lib/simulator-diagnostics"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Login required" },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const scope = url.searchParams.get("scope")

  if (scope === "all") {
    return NextResponse.json({ ok: true, diagnostics: getAllDiagnostics() })
  }

  return NextResponse.json({ ok: true, diagnostics: getLastDiagnostics() })
}
