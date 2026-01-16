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

  let userId: string | undefined
  try {
    userId = (await params).userId
    
    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ ok: false, message: "Invalid userId" }, { status: 400 })
    }
    
    const strategies = await getUserStrategiesFromFirestore(userId)
    return NextResponse.json({ ok: true, user_id: userId, strategies, count: strategies.length })
  } catch (err: any) {
    // Graceful handling for NOT_FOUND or first-time users
    const errCode = err?.code || ""
    const errMsg = (err?.message || "").toLowerCase()
    
    if (errCode === "NOT_FOUND" || errMsg.includes("not found") || errMsg.includes("no document")) {
      console.log(`[internal strategies GET] Creating default for new user: ${userId}`)
      return NextResponse.json({
        ok: true,
        user_id: userId,
        strategies: [],
        count: 0,
        meta: { createdDefault: true },
      })
    }

    console.error("[internal strategies GET] failed", {
      userId,
      errorCode: errCode,
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
