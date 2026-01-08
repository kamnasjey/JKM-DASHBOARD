"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

type FetchResult = {
  url: string
  status: number | null
  bodyPreview: string
  error: string | null
}

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env["VITE_API_BASE"] ||
    "https://api.jkmcopilot.com"
  )
}

function trimText(text: string, max = 500) {
  if (text.length <= max) return text
  return text.slice(0, max) + "…"
}

async function fetchText(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    })

    const text = await res.text()

    return {
      url,
      status: res.status,
      bodyPreview: trimText(text, 500),
      error: null,
    }
  } catch (err: any) {
    return {
      url,
      status: null,
      bodyPreview: "",
      error: err?.message || String(err),
    }
  }
}

export default function DebugApiPage() {
  const baseUrl = useMemo(() => resolveBaseUrl(), [])

  const [health, setHealth] = useState<FetchResult | null>(null)
  const [signals, setSignals] = useState<FetchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)

    const base = String(baseUrl).replace(/\/$/, "")
    const healthUrl = `${base}/health`
    const signalsUrl = `${base}/api/signals?limit=1`

    // Print resolved base URL in browser console for debugging
    // eslint-disable-next-line no-console
    console.info("[debug/api] resolved base url:", base)

    const [healthResult, signalsResult] = await Promise.all([fetchText(healthUrl), fetchText(signalsUrl)])

    setHealth(healthResult)
    setSignals(signalsResult)
    setLoading(false)
  }, [baseUrl])

  useEffect(() => {
    run()
  }, [run])

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">API Debug</h1>
        <p className="text-sm text-muted-foreground">Client-side connectivity check (no auth)</p>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-sm font-medium">Resolved base URL</div>
        <div className="font-mono text-sm break-all">{String(baseUrl)}</div>
        <Button type="button" variant="outline" onClick={run} disabled={loading}>
          {loading ? "Checking…" : "Retry"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResultCard title="GET /health" result={health} />
        <ResultCard title="GET /api/signals?limit=1" result={signals} />
      </div>
    </div>
  )
}

function ResultCard({ title, result }: { title: string; result: FetchResult | null }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground break-all">{result?.url || "—"}</div>
      </div>

      <div className="text-sm">
        <span className="font-medium">Status:</span> {result?.status ?? "—"}
      </div>

      {result?.error ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium">Error</div>
          <div className="font-mono text-xs break-all mt-1">{result.error}</div>
        </div>
      ) : (
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">Response (trimmed)</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs font-mono">{result?.bodyPreview || "—"}</pre>
        </div>
      )}
    </div>
  )
}
