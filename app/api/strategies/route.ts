import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getUserStrategiesFromFirestore, setUserStrategiesInFirestore, type Strategy } from "@/lib/user-data/strategies-store"

export const runtime = "nodejs"

function validateDetectors(detectors: unknown): { ok: boolean; message?: string } {
  if (!Array.isArray(detectors)) return { ok: false, message: "Invalid detectors: array required" }

  const cleaned = detectors.map(String).filter(Boolean)

  const hasGateRegime = cleaned.includes("gate_regime")
  if (!hasGateRegime) return { ok: false, message: "gate_regime detector is required" }

  const gates = cleaned.filter((d) => d.startsWith("gate_")).length
  if (gates < 1) return { ok: false, message: "At least 1 gate detector is required" }

  // Minimum trigger/confluence checks (best-effort based on known set)
  const triggerSet = new Set([
    "pinbar",
    "engulfing",
    "sr_bounce",
    "sr_breakout",
    "compression_expansion",
    "momentum_continuation",
    "mean_reversion_snapback",
  ])

  const confluenceSet = new Set([
    "doji",
    "pinbar_at_level",
    "fibo_retracement",
    "fibo_extension",
    "fibo_retrace_confluence",
    "structure_trend",
    "swing_failure",
    "range_box_edge",
    "fakeout_trap",
    "sr_role_reversal",
  ])

  const triggers = cleaned.filter((d) => triggerSet.has(d)).length
  const confluences = cleaned.filter((d) => confluenceSet.has(d)).length

  if (triggers < 1) return { ok: false, message: "At least 1 trigger detector is required" }
  if (confluences < 1) return { ok: false, message: "At least 1 confluence detector is required" }

  if (cleaned.length < 3) return { ok: false, message: "Too few detectors" }
  if (cleaned.length > 7) return { ok: false, message: "Too many detectors (max 7 recommended)" }

  return { ok: true }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const strategies = await getUserStrategiesFromFirestore(userId)

  return NextResponse.json({ ok: true, strategies, count: strategies.length })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const detectors = body?.detectors

  if (!name) return NextResponse.json({ ok: false, message: "Strategy name is required" }, { status: 400 })

  const valid = validateDetectors(detectors)
  if (!valid.ok) return NextResponse.json({ ok: false, message: valid.message }, { status: 400 })

  const cleanedDetectors = (detectors as unknown[]).map(String).filter(Boolean)

  const existing = await getUserStrategiesFromFirestore(userId)

  const newStrategy: Strategy = {
    strategy_id: globalThis.crypto?.randomUUID ? crypto.randomUUID() : `strat_${Date.now()}`,
    name,
    enabled: true,
    detectors: cleanedDetectors,
  }

  await setUserStrategiesInFirestore(userId, [...existing, newStrategy])

  return NextResponse.json({ ok: true, strategy: newStrategy })
}
