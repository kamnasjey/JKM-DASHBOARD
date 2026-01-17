/**
 * DEPRECATED: Legacy proxy route for strategy-sim
 * 
 * This route is deprecated. Use /api/simulator/run instead.
 * Returns 410 Gone to signal clients to update.
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DEPRECATION_RESPONSE = {
  ok: false,
  error: "DEPRECATED_ENDPOINT",
  message: "This endpoint is deprecated. Use /api/simulator/run instead.",
  migration: {
    oldEndpoint: "/api/proxy/strategy-sim/run",
    newEndpoint: "/api/simulator/run",
    reason: "Consolidated into single simulator endpoint with enhanced features"
  }
}

export async function POST() {
  return NextResponse.json(DEPRECATION_RESPONSE, { status: 410 })
}

export async function GET() {
  return NextResponse.json(DEPRECATION_RESPONSE, { status: 410 })
}
