"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type CheckResult = {
  name: string
  url: string
  status: number | null
  ok: boolean
  latencyMs: number | null
  bodyPreview: string
  error: string | null
  reason: string
  required?: boolean
}

function trimText(text: string, max = 800) {
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

async function runCheck(name: string, url: string): Promise<CheckResult> {
  const started = performance.now()
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" })
    const text = await res.text()
    const latencyMs = Math.round(performance.now() - started)
    const ok = res.ok

    return {
      name,
      url,
      status: res.status,
      ok,
      latencyMs,
      bodyPreview: trimText(text, 800),
      error: null,
      reason: ok ? "OK" : `HTTP ${res.status}`,
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - started)
    const raw = err?.message || String(err)
    return {
      name,
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

export default function RepairClient({ userEmail }: { userEmail: string }) {
  const [results, setResults] = useState<CheckResult[]>([])
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL

  const run = useCallback(async () => {
    setRunning(true)
    setCopied(false)

    const checks: Array<[string, string, boolean]> = [
      // Required endpoints
      ["Proxy: /health", "/api/proxy/health", true],
      ["Proxy: /signals", "/api/proxy/signals?limit=1", true],
      ["Proxy: /engine/status", "/api/proxy/engine/status", true],
      ["Billing: /api/billing/status", "/api/billing/status", true],
      // Optional - backend may not implement these
      ["Proxy: /ping (optional)", "/api/proxy/ping", false],
      ["Proxy: /symbols (optional)", "/api/proxy/symbols", false],
      ["Proxy: /metrics (optional)", "/api/proxy/metrics", false],
      ["Proxy: /strategies (optional)", "/api/proxy/strategies", false],
      ["Proxy: /profile (optional)", "/api/proxy/profile", false],
    ]

    const out = await Promise.all(checks.map(([name, url, required]) => 
      runCheck(name, url).then(r => ({ ...r, required }))
    ))
    setResults(out)
    setRunning(false)
  }, [])

  useEffect(() => {
    run()
  }, [run])

  const hasFailures = useMemo(() => results.some((r) => r.required && !r.ok), [results])

  const reportText = useMemo(() => {
    const payload = {
      title: "JKM Засварын газар — Report",
      generatedAt: new Date().toISOString(),
      userEmail,
      location: typeof window !== "undefined" ? window.location.href : "",
      origin: typeof window !== "undefined" ? window.location.origin : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      publicEnv: {
        NEXT_PUBLIC_WS_URL: wsUrl ?? null,
      },
      checks: results,
    }
    return JSON.stringify(payload, null, 2)
  }, [results, userEmail, wsUrl])

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Засварын газар</span>
            <Badge variant={hasFailures ? "destructive" : "secondary"}>{hasFailures ? "ALERT" : "OK"}</Badge>
          </CardTitle>
          <CardDescription>
            Owner/Admin-д зориулсан debug самбар. Эндээс copy хийж надад явуулбал би яг асуудлыг оношлоод засна.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <div>
              User: <span className="font-mono text-xs">{userEmail || "—"}</span>
            </div>
            <div>
              WS URL: <span className="font-mono text-xs">{wsUrl ?? "(WS ашиглахгүй/тохируулаагүй)"}</span>
            </div>
            <div className="text-xs opacity-80 mt-1">
              Backend realtime + cache хийдэг бол `NEXT_PUBLIC_WS_URL` хэрэггүй.
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={run} disabled={running}>
              {running ? "Шалгаж байна…" : "Дахин шалгах"}
            </Button>
            <Button type="button" onClick={copyReport} disabled={running || results.length === 0}>
              {copied ? "Хууллаа" : "Copy report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((r) => (
          <Card key={r.name} className={!r.required && !r.ok ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{r.name}</span>
                <span
                  className={
                    r.ok
                      ? "text-xs border rounded px-2 py-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : r.required
                        ? "text-xs border rounded px-2 py-1 bg-destructive/10 text-destructive border-destructive/20"
                        : "text-xs border rounded px-2 py-1 bg-muted text-muted-foreground"
                  }
                >
                  {r.ok ? "OK" : r.required ? "FAIL" : "N/A"}
                </span>
              </CardTitle>
              <CardDescription className="break-all">{r.url}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div className="font-mono">{r.status ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Latency (ms)</div>
                  <div className="font-mono">{r.latencyMs ?? "—"}</div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-muted-foreground text-xs">Reason</div>
                <div>{r.reason}</div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-sm font-medium">Body preview</div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs font-mono">{r.bodyPreview || "—"}</pre>
              </div>

              {r.error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <div className="text-sm font-medium text-destructive">Error details</div>
                  <div className="font-mono text-xs break-all mt-1">{r.error}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Copy/Paste</CardTitle>
          <CardDescription>Доорхыг бүхэлд нь хуулж надад явуул.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap break-words text-xs font-mono rounded-md border p-3">{reportText}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
