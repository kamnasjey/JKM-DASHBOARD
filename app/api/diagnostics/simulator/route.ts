/**
 * GET /api/diagnostics/simulator
 * 
 * Diagnostics endpoint for simulator troubleshooting.
 * Returns sanitized information about the last simulator run.
 * 
 * This allows users to verify:
 * - How many detectors were sent vs received
 * - Backend simVersion (confirms deployment)
 * - Detector classification (implemented vs not implemented)
 * - Explainability when 0 trades
 * 
 * NO SECRETS ARE EXPOSED.
 */

import { NextResponse } from "next/server"
import { getLastDiagnostics, getAllDiagnostics } from "@/lib/simulator-diagnostics"

export const runtime = "nodejs"

// Get git commit hash from environment (set by Vercel)
const GIT_COMMIT = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev"
const VERCEL_ENV = process.env.VERCEL_ENV || "development"

export async function GET() {
  const lastDiag = getLastDiagnostics()
  const allDiags = getAllDiagnostics()
  
  const response = {
    ok: true,
    environment: {
      origin: process.env.NEXTAUTH_URL || "https://www.jkmcopilot.com",
      vercelEnv: VERCEL_ENV,
      gitCommit: GIT_COMMIT,
      timestamp: new Date().toISOString(),
    },
    lastRun: lastDiag ? {
      timestamp: lastDiag.timestamp,
      requestId: lastDiag.requestId,
      payload: {
        userId: lastDiag.payload.userId,  // Already masked
        strategyId: lastDiag.payload.strategyId,
        strategyName: lastDiag.payload.strategyName,
        detectorsCount: lastDiag.payload.detectorsCount,
        detectorsList: lastDiag.payload.detectorsList,
        symbols: lastDiag.payload.symbols,
        dateRange: `${lastDiag.payload.from} to ${lastDiag.payload.to}`,
        timeframe: lastDiag.payload.timeframe,
        demoMode: lastDiag.payload.demoMode,
      },
      response: {
        ok: lastDiag.response.ok,
        entriesTotal: lastDiag.response.entriesTotal ?? null,
        winrate: lastDiag.response.winrate ?? null,
        backendVersion: lastDiag.response.meta?.simVersion ?? "unknown",
        detectorClassification: {
          requested: lastDiag.response.meta?.detectorsRequested?.length ?? 0,
          recognized: lastDiag.response.meta?.detectorsRecognized?.length ?? 0,
          implemented: lastDiag.response.meta?.detectorsImplemented?.length ?? 0,
          notImplemented: lastDiag.response.meta?.detectorsNotImplemented?.length ?? 0,
          unknown: lastDiag.response.meta?.detectorsUnknown?.length ?? 0,
          // Full lists for debugging
          implementedList: lastDiag.response.meta?.detectorsImplemented ?? [],
          notImplementedList: lastDiag.response.meta?.detectorsNotImplemented ?? [],
          unknownList: lastDiag.response.meta?.detectorsUnknown ?? [],
        },
        explainability: lastDiag.response.explainability ?? null,
        warnings: lastDiag.response.meta?.warnings ?? [],
        errorCode: lastDiag.response.errorCode ?? null,
        errorMessage: lastDiag.response.errorMessage ?? null,
      },
    } : null,
    recentRuns: allDiags.length,
    message: lastDiag 
      ? "Showing last simulator run. Run a simulation to update this data."
      : "No simulator runs recorded yet. Run a simulation first.",
    docs: {
      description: "This endpoint shows diagnostic info about the last simulator run. No secrets are exposed.",
      usage: "Open https://www.jkmcopilot.com/api/diagnostics/simulator in browser after running a simulation.",
      fields: {
        "payload.detectorsCount": "Number of detectors from your strategy in Firestore",
        "response.detectorClassification": "How backend classified your detectors",
        "response.backendVersion": "Backend SIM_VERSION - confirms which code is deployed",
        "response.explainability": "When entries=0, explains why no trades were found",
      },
    },
  }
  
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
