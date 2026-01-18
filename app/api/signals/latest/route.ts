/**
 * SIGNALS LATEST API ROUTE (PUBLIC)
 * ===================================
 * Returns single most recent signal
 * NOTE: Public endpoint - no auth required (no PII)
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com";

export async function GET(req: NextRequest) {
  // PUBLIC endpoint - no auth required
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");

  try {
    const backendUrl = new URL(`${BACKEND_ORIGIN}/signals/latest`);
    if (symbol) backendUrl.searchParams.set("symbol", symbol);

    const resp = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: "BACKEND_ERROR", status: resp.status },
        { status: 502 }
      );
    }

    const data = await resp.json();

    if (!data.signal) {
      return NextResponse.json({ ok: false, signal: null, message: "No signals" });
    }

    const sig = data.signal;
    return NextResponse.json({
      ok: true,
      signal: {
        id: sig.signal_id || String(Math.random()).slice(2, 10),
        ts: sig.ts,
        symbol: sig.symbol,
        timeframe: sig.timeframe,
        direction: sig.direction,
        rr: sig.rr,
        confidence: sig.confidence,
        strategyId: sig.strategy_id,
        detectors: sig.detectors_normalized || [],
        hitsPerDetector: sig.hits_per_detector || {},
        explain: sig.explain || {},
        source: sig.source || "scanner",
      },
    });
  } catch (err) {
    console.error("[signals/latest] Fetch error:", err);
    return NextResponse.json(
      { ok: false, error: "FETCH_FAILED", message: String(err) },
      { status: 500 }
    );
  }
}
