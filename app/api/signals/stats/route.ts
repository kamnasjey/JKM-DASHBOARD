/**
 * SIGNALS STATS API ROUTE (PUBLIC)
 * ==================================
 * Proxies to backend /signals/stats endpoint
 * NOTE: Public endpoint - no auth required (no PII)
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:8000";

export async function GET() {
  // PUBLIC endpoint - no auth required
  try {
    const resp = await fetch(`${BOT_API_URL}/signals/stats`, {
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

    return NextResponse.json({
      ok: true,
      total: data.total || 0,
      last24h: data.last24h || 0,
      bySymbol: data.bySymbol || {},
      byDirection: data.byDirection || {},
    });
  } catch (err) {
    console.error("[signals/stats] Fetch error:", err);
    return NextResponse.json(
      { ok: false, error: "FETCH_FAILED", message: String(err) },
      { status: 500 }
    );
  }
}
