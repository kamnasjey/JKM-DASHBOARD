/**
 * POST /api/simulator/run
 * 
 * Strategy Simulator - Server-side route handler
 * 
 * Architecture:
 * - Client sends request here (dashboard domain only)
 * - We authenticate via NextAuth session
 * - Load access from Firestore (users/{uid}.hasPaidAccess)
 * - Load strategy from Firestore (users/{uid}/strategies/{strategyId})
 * - Proxy compute to backend with INTERNAL_API_KEY
 * - Return result to client
 * 
 * NO PRISMA DEPENDENCY.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { isOwnerEmail } from "@/lib/owner"
import { randomUUID } from "crypto"
import {
  validateSimulatorRequest,
  formatZodErrors,
  getDateRangeDays,
  limitDateRange,
} from "@/lib/schemas/simulator"
import { getStrategy } from "@/lib/user-data/strategies-firestore-store"
import { storeSimulatorDiagnostics, maskUserId, SimulatorDiagnostics } from "@/lib/simulator-diagnostics"

export const runtime = "nodejs"

// Backend configuration
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"
const INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY

// Demo mode limits
const DEMO_MAX_SYMBOLS = 1
const DEMO_MAX_DAYS = 7
/**
 * Check if user has paid access from Firestore
 */
async function checkUserAccess(userId: string): Promise<boolean> {
  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    const data = userDoc.data()
    return data?.hasPaidAccess === true || data?.has_paid_access === true
  } catch {
    return false
  }
}

/**
 * POST /api/simulator/run
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  
  // --- 1. Authentication ---
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Login required" },
      { status: 401 }
    )
  }
  
  const userId = (session.user as any).id as string
  const userEmail = (session.user as any).email as string
  
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "INVALID_SESSION", message: "Session missing user ID" },
      { status: 401 }
    )
  }
  
  // --- 2. Parse and validate request body ---
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "Invalid JSON body" },
      { status: 400 }
    )
  }
  
  const validation = validateSimulatorRequest(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: formatZodErrors(validation.error),
      },
      { status: 422 }
    )
  }
  
  const { strategyId, symbols, from, to, timeframe, mode, demoMode: clientDemoMode } = validation.data
  
  // --- 3. Check access (owner bypass) ---
  const isOwner = isOwnerEmail(userEmail)
  let hasPaidAccess = isOwner ? true : await checkUserAccess(userId)
  // Demo mode: forced by client OR due to lack of paid access
  let demoMode = clientDemoMode || !hasPaidAccess
  let effectiveSymbols = symbols
  let effectiveFrom = from
  let effectiveTo = to
  let demoMessage: string | undefined
  
  if (demoMode) {
    // Demo mode limitations
    effectiveSymbols = symbols.slice(0, DEMO_MAX_SYMBOLS)
    const limited = limitDateRange(from, to, DEMO_MAX_DAYS)
    effectiveFrom = limited.from
    effectiveTo = limited.to
    
    const rangeChanged = effectiveFrom !== from || effectiveTo !== to
    const symbolsLimited = effectiveSymbols.length < symbols.length
    
    const limits: string[] = []
    if (symbolsLimited) limits.push(`${DEMO_MAX_SYMBOLS} symbol`)
    if (rangeChanged) limits.push(`${DEMO_MAX_DAYS} days`)
    
    demoMessage = `Demo mode: limited to ${limits.join(", ")}. Upgrade for full access.`
    
    console.log(`[${requestId}] Demo mode for user ${userId}: ${demoMessage}`)
  }
  
  // --- 4. Load strategy from Firestore ---
  const strategy = await getStrategy(userId, strategyId)
  
  if (!strategy) {
    return NextResponse.json(
      { ok: false, error: "STRATEGY_NOT_FOUND", message: `Strategy ${strategyId} not found` },
      { status: 404 }
    )
  }
  
  // --- 5. Check internal API key ---
  if (!INTERNAL_API_KEY) {
    console.error(`[${requestId}] BACKEND_INTERNAL_API_KEY not configured`)
    return NextResponse.json(
      { ok: false, error: "CONFIG_ERROR", message: "Backend not configured" },
      { status: 500 }
    )
  }
  
  // --- 6. Build backend payload ---
  const backendPayload = {
    uid: userId,
    symbols: effectiveSymbols,
    from: effectiveFrom,
    to: effectiveTo,
    timeframe: timeframe || "auto",
    mode: mode || "winrate",
    strategy: {
      id: strategy.id,
      name: strategy.name,
      detectors: strategy.detectors || [],
      symbols: strategy.symbols || [],
      timeframe: strategy.timeframe,
      config: strategy.config || {},
    },
    demoMode,
  }
  
  // Log detector count for debugging
  console.log(`[${requestId}] Simulator request: userId=${userId}, strategyId=${strategyId}, detectorsCount=${strategy.detectors?.length || 0}, detectors=[${(strategy.detectors || []).join(", ")}]`)
  
  // --- 7. Proxy to backend ---
  const backendUrl = `${BACKEND_ORIGIN}/api/simulator/run`
  
  try {
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(backendPayload),
    })
    
    const backendText = await backendResponse.text()
    let backendJson: any
    
    try {
      backendJson = JSON.parse(backendText)
    } catch {
      console.error(`[${requestId}] Backend returned non-JSON:`, backendText.slice(0, 500))
      return NextResponse.json(
        { ok: false, error: "BACKEND_ERROR", message: "Backend returned invalid response" },
        { status: 502 }
      )
    }
    
    // --- 8. Map backend errors ---
    if (!backendResponse.ok) {
      const status = backendResponse.status
      
      if (status === 401 || status === 403) {
        console.error(`[${requestId}] Backend auth error: ${status}`)
        return NextResponse.json(
          {
            ok: false,
            error: "BACKEND_KEY_MISMATCH",
            message: "Backend authentication failed. Check BACKEND_INTERNAL_API_KEY configuration.",
          },
          { status: 502 }
        )
      }
      
      if (status === 422) {
        // Pass through DATA_GAP errors with full details
        if (backendJson?.error?.code === "DATA_GAP" || backendJson?.ok === false) {
          return NextResponse.json(
            {
              ok: false,
              error: backendJson?.error || {
                code: "VALIDATION_ERROR",
                message: backendJson?.message || "Backend validation failed",
              },
            },
            { status: 422 }
          )
        }
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: backendJson?.error?.message || backendJson?.message || "Backend validation failed",
              details: backendJson?.error?.details || backendJson?.details,
            },
          },
          { status: 422 }
        )
      }
      
      if (status >= 500) {
        console.error(`[${requestId}] Backend server error: ${status}`, backendJson)
        return NextResponse.json(
          {
            ok: false,
            error: "BACKEND_UNAVAILABLE",
            message: backendJson?.error?.message || "Backend server error",
          },
          { status: 502 }
        )
      }
      
      // Other errors
      return NextResponse.json(
        {
          ok: false,
          error: backendJson?.error?.code || "BACKEND_ERROR",
          message: backendJson?.error?.message || backendJson?.message || "Backend error",
        },
        { status: backendResponse.status }
      )
    }
    
    // --- 9. Add demo mode info to successful response ---
    if (demoMode && backendJson.ok) {
      backendJson.demoMode = true
      backendJson.demoMessage = demoMessage
      if (backendJson.meta) {
        backendJson.meta.demoMode = true
      }
    }
    
    // --- 10. Store diagnostics for debugging endpoint ---
    try {
      const diagnosticsEntry: SimulatorDiagnostics = {
        timestamp: new Date().toISOString(),
        requestId,
        payload: {
          userId: maskUserId(userId),
          strategyId,
          strategyName: strategy.name || strategyId,
          detectorsCount: strategy.detectors?.length || 0,
          detectorsList: strategy.detectors || [],
          symbols: effectiveSymbols,
          from: effectiveFrom,
          to: effectiveTo,
          timeframe: timeframe || "auto",
          demoMode,
        },
        response: {
          ok: backendJson.ok,
          entriesTotal: backendJson.summary?.entries ?? backendJson.combined?.summary?.entries,
          winrate: backendJson.summary?.winrate ?? backendJson.combined?.summary?.winrate,
          meta: backendJson.meta ? {
            simVersion: backendJson.meta.simVersion,
            baseTimeframe: backendJson.meta.baseTimeframe,
            detectorsRequested: backendJson.meta.detectorsRequested,
            detectorsRecognized: backendJson.meta.detectorsRecognized,
            detectorsImplemented: backendJson.meta.detectorsImplemented,
            detectorsNotImplemented: backendJson.meta.detectorsNotImplemented,
            detectorsUnknown: backendJson.meta.detectorsUnknown,
            warnings: backendJson.meta.warnings?.slice(0, 5),
          } : undefined,
          explainability: backendJson.explainability ? {
            rootCause: backendJson.explainability.rootCause,
            explanation: backendJson.explainability.explanation,
            severity: backendJson.explainability.severity,
            suggestions: backendJson.explainability.suggestions?.slice(0, 3),
          } : undefined,
        },
      }
      storeSimulatorDiagnostics(diagnosticsEntry)
    } catch (diagErr) {
      console.error(`[${requestId}] Failed to store diagnostics:`, diagErr)
    }
    
    return NextResponse.json(backendJson)
    
  } catch (err: any) {
    console.error(`[${requestId}] Backend network error:`, err?.message || err)
    return NextResponse.json(
      {
        ok: false,
        error: "BACKEND_UNAVAILABLE",
        message: "Failed to reach backend server",
      },
      { status: 502 }
    )
  }
}
