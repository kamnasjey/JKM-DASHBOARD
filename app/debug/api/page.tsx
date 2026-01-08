"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { API } from "@/lib/config"

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

function resolveBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? API
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
  const baseUrl = useMemo(() => resolveBaseUrl(), [])

  const [health, setHealth] = useState<CheckResult | null>(null)
  const [ping, setPing] = useState<CheckResult | null>(null)
  const [signals, setSignals] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)

    const base = String(baseUrl).replace(/\/$/, "")
    const healthUrl = `${base}/health`
    const pingUrl = `${base}/api/ping`
    const signalsUrl = `${base}/api/signals?limit=3`

    // Print resolved base URL in browser console for debugging
    // eslint-disable-next-line no-console
    console.info("[debug/api] resolved base url:", base)

    const [healthResult, pingResult, signalsResult] = await Promise.all([
      runCheck("/health", healthUrl),
      runCheck("/api/ping", pingUrl),
      runCheck("/api/signals?limit=3", signalsUrl),
    ])

    setHealth(healthResult)
    setPing(pingResult)
    setSignals(signalsResult)
    setLoading(false)
  }, [baseUrl])

  useEffect(() => {
    run()
  }, [run])

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Connectivity Checks</CardTitle>
          <CardDescription>Press “Run checks”. No login required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">API Base URL (resolved)</div>
            <div className="font-mono text-sm break-all">{String(baseUrl)}</div>
            <div className="text-xs text-muted-foreground">
              Uses <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span> or defaults to https://api.jkmcopilot.com
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
