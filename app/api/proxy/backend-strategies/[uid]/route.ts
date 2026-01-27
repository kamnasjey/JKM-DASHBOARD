/**
 * Proxy to Backend: GET /api/internal/user-data/strategies/{uid}
 * Returns user strategies + activeStrategyId + activeStrategyMap from Python backend
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { listStrategies } from "@/lib/user-data/strategies-firestore-store"
import { getStrategyConfig } from "@/lib/user-data/strategy-config-store"

interface ExtendedSession {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

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

  try {
    const [strategyConfig, list] = await Promise.all([
      getStrategyConfig(uid),
      listStrategies(uid, { limit: 100 }),
    ])

    const strategies = list.strategies.map((s) => ({
      id: s.id,
      name: s.name,
      detectors: s.detectors || [],
      symbols: s.symbols || [],
      timeframes: s.timeframe ? [s.timeframe] : [],
      minRR: s.config?.min_rr ?? s.config?.minRR ?? 0,
      enabled: s.enabled ?? true,
      tags: Array.isArray((s as any).tags) ? (s as any).tags : undefined,
      isStarterClone: (s as any).isStarterClone ?? (s as any).is_starter_clone,
    }))

    const activeStrategyId =
      strategyConfig.activeStrategyId ||
      strategies[0]?.id ||
      ""

    const activeStrategyMap = strategyConfig.activeStrategyMap || {}
    const symbolEnabled = strategyConfig.symbolEnabled || {}
    const requireExplicitMapping = strategyConfig.requireExplicitMapping ?? true

    return NextResponse.json({
      ok: true,
      uid,
      strategies,
      activeStrategyId,
      activeStrategyMap,
      symbolEnabled,
      requireExplicitMapping,
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
