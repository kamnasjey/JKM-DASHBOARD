/**
 * GET /api/diagnostics/simulator
 * 
 * Diagnostics endpoint for simulator troubleshooting.
 * Returns sanitized information about the last 10 simulator runs.
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
import { getAllDiagnostics, SimulatorDiagnostics } from "@/lib/simulator-diagnostics"

export const runtime = "nodejs"

// Get git commit hash from environment (set by Vercel)
const GIT_COMMIT = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev"
const VERCEL_ENV = process.env.VERCEL_ENV || "development"

function formatDiagnosticEntry(diag: SimulatorDiagnostics) {
  return {
    ts: diag.timestamp,
    requestId: diag.requestId,
    strategyId: diag.payload.strategyId,
    strategyName: diag.payload.strategyName,
    symbols: diag.payload.symbols,
    range: { from: diag.payload.from, to: diag.payload.to },
    timeframe: diag.payload.timeframe,
    demoMode: diag.payload.demoMode,
    detectors: {
      requested: diag.payload.detectorsList,
      normalized: diag.payload.detectorsNormalized || diag.payload.detectorsList,
      countRequested: diag.payload.detectorsCount,
      countNormalized: diag.payload.detectorsNormalized?.length || diag.payload.detectorsCount,
    },
    result: {
      ok: diag.response.ok,
      entries: diag.response.entriesTotal ?? null,
      winrate: diag.response.winrate ?? null,
    },
    backend: {
      simVersion: diag.response.meta?.simVersion ?? "unknown",
      implemented: diag.response.meta?.detectorsImplemented ?? [],
      notImplemented: diag.response.meta?.detectorsNotImplemented ?? [],
      unknown: diag.response.meta?.detectorsUnknown ?? [],
    },
    explainability: diag.response.explainability ?? null,
    warnings: diag.response.meta?.warnings ?? [],
  }
}

export async function GET() {
  const allDiags = getAllDiagnostics()
  
  // Format runs from newest to oldest
  const runs = allDiags
    .slice()
    .reverse()
    .map(formatDiagnosticEntry)
  
  const response = {
    ok: true,
    count: runs.length,
    runs,
    environment: {
      origin: process.env.NEXTAUTH_URL || "https://www.jkmcopilot.com",
      vercelEnv: VERCEL_ENV,
      gitCommit: GIT_COMMIT,
      timestamp: new Date().toISOString(),
    },
    message: runs.length > 0 
      ? `Showing last ${runs.length} simulator run(s). Run a simulation to update.`
      : "No simulator runs recorded yet. Run a simulation first.",
  }
  
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
