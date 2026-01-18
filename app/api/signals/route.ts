/**
 * SIGNALS API ROUTE (PUBLIC)
 * ==========================
 * Proxies to backend /signals endpoint
 * Returns scanner-published signals from signals.jsonl
 * 
 * NOTE: This endpoint is PUBLIC (no auth required).
 * It only returns non-sensitive scanner signals (symbol, tf, rr, confidence).
 * No user PII is exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(500).optional().default(50),
  symbol: z.string().optional(),
  strategy_id: z.string().optional(),
  hours: z.coerce.number().min(1).max(168).optional(),
});

export async function GET(req: NextRequest) {
  // PUBLIC endpoint - no auth required
  // Parse query params
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PARAMS", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { limit, symbol, strategy_id, hours } = parsed.data;

  // Build backend URL
  const backendUrl = new URL(`${BACKEND_ORIGIN}/api/signals`);
  backendUrl.searchParams.set("limit", String(limit));
  if (symbol) backendUrl.searchParams.set("symbol", symbol);
  if (strategy_id) backendUrl.searchParams.set("strategy_id", strategy_id);
  if (hours) backendUrl.searchParams.set("hours", String(hours));

  try {
    const resp = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(INTERNAL_API_KEY ? { "x-internal-api-key": INTERNAL_API_KEY } : {}),
      },
      next: { revalidate: 0 },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: "BACKEND_ERROR", status: resp.status },
        { status: 502 }
      );
    }

    const data = await resp.json();

    const rawSignals = Array.isArray(data) ? data : data.signals || []

    const toEpochSeconds = (value?: unknown) => {
      if (!value || typeof value !== "string") return undefined
      const ts = Date.parse(value)
      return Number.isFinite(ts) ? Math.floor(ts / 1000) : undefined
    }

    // Map to frontend format (full signal shape)
    const signals = rawSignals.map((sig: Record<string, unknown>) => {
      const ts = typeof sig.ts === "string" ? sig.ts : undefined
      const createdAt = (sig.created_at as number | undefined) ?? toEpochSeconds(ts)
      return {
        signal_id: sig.signal_id || String(Math.random()).slice(2, 10),
        ts,
        created_at: createdAt ?? 0,
        symbol: sig.symbol,
        timeframe: sig.timeframe,
        tf: sig.tf || sig.timeframe,
        direction: sig.direction,
        status: sig.status || "FOUND",
        entry: sig.entry,
        sl: sig.sl,
        tp: sig.tp,
        rr: sig.rr,
        confidence: sig.confidence,
        outcome: sig.outcome,
        resolved_at: sig.resolved_at,
        resolved_price: sig.resolved_price,
        strategy_id: sig.strategy_id,
        strategy_name: sig.strategy_name,
        detectors_normalized: sig.detectors_normalized || [],
        hits_per_detector: sig.hits_per_detector || {},
        explain: sig.explain || {},
        evidence: sig.evidence || {},
        chart_drawings: sig.chart_drawings || [],
        engine_annotations: sig.engine_annotations || {},
        source: sig.source || "scanner",
        simVersion: sig.simVersion,
      }
    })

    return NextResponse.json({
      ok: true,
      count: signals.length,
      total: (Array.isArray(data) ? signals.length : (data.total || signals.length)),
      signals,
      source: "backend_signals",
    });
  } catch (err) {
    console.error("[signals/route] Fetch error:", err);
    return NextResponse.json(
      { ok: false, error: "FETCH_FAILED", message: String(err) },
      { status: 500 }
    );
  }
}
