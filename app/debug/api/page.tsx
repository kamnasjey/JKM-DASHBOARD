"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type CheckResult = {
  endpoint: string
  url: string
  status: number | null
  ok: boolean
  latencyMs: number | null
  bodyPreview: string
  error: string | null
  reason: string
}

function trimText(text: string, max = 500) {
  if (text.length <= max) return text
  return text.slice(0, max) + "…"
}

function humanizeFetchError(message: string) {
  const msg = message || "Unknown error"
  if (msg === "Failed to fetch" || /Failed to fetch/i.test(msg)) {
    return "CORS/DNS/SSL or network (Failed to fetch)"
  }
  return msg
}

async function runCheck(endpoint: string, url: string): Promise<CheckResult> {
  const started = performance.now()
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    })

    const text = await res.text()
    const latencyMs = Math.round(performance.now() - started)
    const ok = res.ok

    return {
      endpoint,
      url,
      status: res.status,
      ok,
      latencyMs,
      bodyPreview: trimText(text, 500),
      error: null,
      reason: ok ? "OK" : `HTTP ${res.status}`,
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - started)
    const raw = err?.message || String(err)
    return {
      endpoint,
      url,
      status: null,
      ok: false,
      latencyMs,
      bodyPreview: "",
      error: raw,
      reason: humanizeFetchError(raw),
    }
  }
}

export default function DebugApiPage() {
  const [health, setHealth] = useState<CheckResult | null>(null)
  const [ping, setPing] = useState<CheckResult | null>(null)
  const [signals, setSignals] = useState<CheckResult | null>(null)
  const [symbols, setSymbols] = useState<CheckResult | null>(null)
  const [openapi, setOpenapi] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)

    // All calls go through proxy routes now
    const healthUrl = "/api/proxy/health"
    const pingUrl = "/api/proxy/ping"
    const signalsUrl = "/api/proxy/signals?limit=3"
    const symbolsUrl = "/api/proxy/symbols"
    const openapiUrl = "/api/proxy/openapi"

    const [healthResult, pingResult, signalsResult, symbolsResult, openapiResult] = await Promise.all([
      runCheck("/health", healthUrl),
      runCheck("/api/ping", pingUrl),
      runCheck("/api/signals?limit=3", signalsUrl),
      runCheck("/api/symbols", symbolsUrl),
      runCheck("/openapi.json", openapiUrl),
    ])

    setHealth(healthResult)
    setPing(pingResult)
    setSignals(signalsResult)
    setSymbols(symbolsResult)
    setOpenapi(openapiResult)
    setLoading(false)
  }, [])

  useEffect(() => {
    run()
  }, [run])

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Connectivity Checks</CardTitle>
          <CardDescription>Proxy routes (/api/proxy/*) руу шалгах. Health нь нээлттэй.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Proxy Base</div>
            <div className="font-mono text-sm break-all">/api/proxy</div>
            <div className="text-xs text-muted-foreground">
              Client нь backend-руу шууд холбогдохгүй, бүх хүсэлт Next.js proxy-аар дамжина.
            </div>
          </div>
          <Button type="button" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run checks"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <CheckCard result={health} />
        <CheckCard result={ping} />
        <CheckCard result={signals} />
        <CheckCard result={symbols} />
        <CheckCard result={openapi} />
      </div>
    </div>
  )
}

function CheckCard({ result }: { result: CheckResult | null }) {
  const badgeText = result ? (result.ok ? "OK" : "FAIL") : "—"
  const badgeClass = result
    ? result.ok
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-muted text-muted-foreground"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm">{result?.endpoint || "—"}</span>
          <span className={`text-xs border rounded px-2 py-1 ${badgeClass}`}>{badgeText}</span>
        </CardTitle>
        <CardDescription className="break-all">{result?.url || "—"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Status code</div>
            <div className="font-mono">{result?.status ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Latency (ms)</div>
            <div className="font-mono">{result?.latencyMs ?? "—"}</div>
          </div>
        </div>

        <div className="text-sm">
          <div className="text-muted-foreground text-xs">Reason</div>
          <div>{result?.reason || "—"}</div>
        </div>

        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">JSON preview (trimmed)</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs font-mono">{result?.bodyPreview || "—"}</pre>
        </div>

        {result?.error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
            <div className="text-sm font-medium text-destructive">Error details</div>
            <div className="font-mono text-xs break-all mt-1">{result.error}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
