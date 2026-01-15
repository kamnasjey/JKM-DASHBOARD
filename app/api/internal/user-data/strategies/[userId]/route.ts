import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getUserStrategiesFromFirestore, setUserStrategiesInFirestore } from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

function toSafeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(_request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  try {
    const userId = (await params).userId
    const strategies = await getUserStrategiesFromFirestore(userId)
    return NextResponse.json({ ok: true, user_id: userId, strategies, count: strategies.length })
  } catch (err) {
    const userId = (() => {
      try {
        return (err as any)?.userId ?? undefined
      } catch {
        return undefined
      }
    })()

    console.error("[internal strategies GET] failed", {
      routeUserId: (() => {
        try {
          return (params as any)?.userId
        } catch {
          return undefined
        }
      })(),
      userId,
      errorMessage: toSafeErrorMessage(err),
      error: err,
    })

    return NextResponse.json(
      {
        ok: false,
        message: "Internal strategies GET failed",
        details: toSafeErrorMessage(err),
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireInternalApiKey(request)
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status })

  try {
    const userId = (await params).userId
    const body = await request.json().catch(() => null)
    const strategies = body?.strategies

    if (!Array.isArray(strategies)) {
      return NextResponse.json({ ok: false, message: "Invalid payload: strategies[] required" }, { status: 400 })
    }

    await setUserStrategiesInFirestore(userId, strategies)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[internal strategies PUT] failed", {
      errorMessage: toSafeErrorMessage(err),
      error: err,
    })

    return NextResponse.json(
      {
        ok: false,
        message: "Internal strategies PUT failed",
        details: toSafeErrorMessage(err),
      },
      { status: 500 }
    )
  }
}
