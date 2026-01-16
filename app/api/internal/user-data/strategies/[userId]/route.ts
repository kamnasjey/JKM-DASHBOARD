import { NextRequest, NextResponse } from "next/server"
import { requireInternalApiKey } from "@/lib/internal-api-auth"
import { getUserStrategiesFromFirestore, setUserStrategiesInFirestore } from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

function validateUserId(userId: string | undefined) {
  if (!userId || userId === "undefined" || userId === "null" || userId.trim() === "") {
    return { ok: false as const, status: 400 as const, message: "Missing or invalid userId" }
  }
  return { ok: true as const }
}

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

    const v = validateUserId(userId)
    if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })
    
    const strategies = await getUserStrategiesFromFirestore(userId)
    return NextResponse.json({ ok: true, user_id: userId, strategies, count: strategies.length })
  } catch (err: any) {
    // Graceful handling for NOT_FOUND or first-time users
    // Firestore NOT_FOUND error code is 5 (number) or "NOT_FOUND" (string)
    const errCode = err?.code
    const errMsg = (err?.message || "").toLowerCase()
    
    const isNotFound = 
      errCode === 5 || 
      errCode === "5" ||
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") ||
      errMsg.includes("not found") || 
      errMsg.includes("no document")
    
    if (isNotFound) {
      console.log(`[internal strategies GET] New user (no doc): ${userId}`)
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

  let userId: string | undefined
  try {
    userId = (await params).userId
    const v = validateUserId(userId)
    if (!v.ok) return NextResponse.json({ ok: false, message: v.message }, { status: v.status })

    const body = await request.json().catch(() => null)
    const strategies = body?.strategies

    if (!Array.isArray(strategies)) {
      return NextResponse.json({ ok: false, message: "Invalid payload: strategies[] required" }, { status: 400 })
    }

    await setUserStrategiesInFirestore(userId, strategies)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // Graceful handling for NOT_FOUND - use set with merge:true which creates doc if missing
    const errCode = err?.code || ""
    const errMsg = (err?.message || "").toLowerCase()
    
    if (
      errCode === 5 || 
      errCode === "NOT_FOUND" || 
      errMsg.includes("not_found") || 
      errMsg.includes("not found")
    ) {
      console.log(`[internal strategies PUT] NOT_FOUND for ${userId}, but set(merge:true) should handle this`)
    }

    console.error("[internal strategies PUT] failed", {
      userId,
      errorCode: errCode,
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
