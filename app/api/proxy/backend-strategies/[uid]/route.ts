/**
 * Proxy to Backend: GET /api/internal/user-data/strategies/{uid}
 * Returns user strategies + activeStrategyId + activeStrategyMap from Python backend
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

interface ExtendedSession {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const BACKEND =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.BACKEND_ORIGIN ||
  "https://api.jkmcopilot.com"
const API_KEY = process.env.INTERNAL_API_KEY || ""

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getServerSession(authOptions) as ExtendedSession | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { uid } = await params
  
  // Security: only allow users to fetch their own data
  if (uid !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  if (!API_KEY) {
    console.error("[proxy/backend-strategies] Missing INTERNAL_API_KEY")
    return NextResponse.json({ ok: false, error: "Internal auth missing" }, { status: 500 })
  }

  try {
    const res = await fetch(`${BACKEND}/api/internal/user-data/strategies/${uid}`, {
      method: "GET",
      headers: {
        "x-internal-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[proxy/backend-strategies] Backend error:", res.status, text)
      return NextResponse.json(
        { ok: false, error: `Backend error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    const rawStrategies = Array.isArray(data?.strategies) ? data.strategies : []
    const strategies = rawStrategies.map((s: any) => ({
      id: s.id || s.strategy_id || s.strategyId || "",
      name: s.name || s.strategy_name || s.strategyName || s.strategy_id || "Unnamed",
      detectors: Array.isArray(s.detectors) ? s.detectors : [],
      symbols: Array.isArray(s.symbols) ? s.symbols : [],
      timeframes: Array.isArray(s.timeframes) ? s.timeframes : (s.timeframe ? [s.timeframe] : []),
      minRR: s.min_rr ?? s.minRR ?? 0,
      enabled: s.enabled ?? true,
      tags: Array.isArray(s.tags) ? s.tags : undefined,
      isStarterClone: s.isStarterClone ?? s.is_starter_clone,
    }))

    const activeStrategyId =
      data?.activeStrategyId ||
      data?.active_strategy_id ||
      strategies[0]?.id ||
      ""

    const activeStrategyMap =
      data?.activeStrategyMap ||
      data?.active_strategy_map ||
      data?.strategyMap ||
      {}

    return NextResponse.json({
      ok: data?.ok ?? true,
      uid,
      strategies,
      activeStrategyId,
      activeStrategyMap,
      count: strategies.length,
    })
  } catch (error: any) {
    console.error("[proxy/backend-strategies] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    )
  }
}
