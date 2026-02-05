import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Simulation history record type
interface SimulationRecord {
  id?: string
  strategyId: string
  strategyName: string
  symbol: string
  dateRange: { from: string; to: string }
  timeframes: string[]
  // Results
  totalTrades: number
  tpCount: number
  slCount: number
  winRate: number
  bestTf?: string
  bestWinRate?: number
  // Detectors used
  detectors: string[]
  // Metadata
  createdAt: string
  // Optional: store sample trades (limit to 10 for storage)
  tradesSample?: any[]
}

// GET - Get user's simulation history
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  if (!userId) {
    return NextResponse.json({ ok: false, message: "User ID missing" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("simulations")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get()

    const history: SimulationRecord[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SimulationRecord[]

    return NextResponse.json({ ok: true, history })
  } catch (err) {
    console.error("[simulator/history] GET error:", err)
    return NextResponse.json({ ok: false, message: "Failed to load history" }, { status: 500 })
  }
}

// POST - Save a new simulation result
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  if (!userId) {
    return NextResponse.json({ ok: false, message: "User ID missing" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
      strategyId,
      strategyName,
      symbol,
      dateRange,
      timeframes,
      totalTrades,
      tpCount,
      slCount,
      winRate,
      bestTf,
      bestWinRate,
      detectors,
      tradesSample,
    } = body

    if (!strategyId || !symbol) {
      return NextResponse.json({ ok: false, message: "strategyId and symbol required" }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const now = new Date().toISOString()

    const record: SimulationRecord = {
      strategyId,
      strategyName: strategyName || strategyId,
      symbol,
      dateRange: dateRange || { from: "", to: "" },
      timeframes: timeframes || [],
      totalTrades: totalTrades || 0,
      tpCount: tpCount || 0,
      slCount: slCount || 0,
      winRate: winRate || 0,
      bestTf: bestTf || undefined,
      bestWinRate: bestWinRate || undefined,
      detectors: detectors || [],
      createdAt: now,
      // Only save first 10 trades as sample
      tradesSample: (tradesSample || []).slice(0, 10),
    }

    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("simulations")
      .add(record)

    return NextResponse.json({ ok: true, id: docRef.id })
  } catch (err) {
    console.error("[simulator/history] POST error:", err)
    return NextResponse.json({ ok: false, message: "Failed to save" }, { status: 500 })
  }
}

// DELETE - Delete a simulation record
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  if (!userId) {
    return NextResponse.json({ ok: false, message: "User ID missing" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const simId = searchParams.get("id")

  if (!simId) {
    return NextResponse.json({ ok: false, message: "Simulation ID required" }, { status: 400 })
  }

  try {
    const db = getFirebaseAdminDb()
    await db
      .collection("users")
      .doc(userId)
      .collection("simulations")
      .doc(simId)
      .delete()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[simulator/history] DELETE error:", err)
    return NextResponse.json({ ok: false, message: "Failed to delete" }, { status: 500 })
  }
}
