import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.NEXT_PUBLIC_GIT_SHA ||
    "unknown"

  const deployedAt = new Date().toISOString()

  return NextResponse.json({
    ok: true,
    commit,
    deployedAt,
  })
}
