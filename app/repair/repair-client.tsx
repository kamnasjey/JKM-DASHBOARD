"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, Copy, RefreshCw, Activity, AlertCircle } from "lucide-react"

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

type DiagnosticIssue = {
  id: string
  severity: "error" | "warning" | "info"
  title: string
  description: string
  suggestion: string
}

type WebSocketStatus = {
  tested: boolean
  connected: boolean
  error: string | null
  latencyMs: number | null
}

type SignalDuplicate = {
  key: string
  count: number
  timestamps: string[]
}

type BackendHealth = {
  ok: boolean
  uptime_s?: number
  signals_count?: number
  cache_ready?: boolean
  symbols_count?: number
  error?: string
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
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({ tested: false, connected: false, error: null, latencyMs: null })
  const [duplicates, setDuplicates] = useState<SignalDuplicate[]>([])
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [issues, setIssues] = useState<DiagnosticIssue[]>([])

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Test WebSocket connection
  const testWebSocket = useCallback(async () => {
    if (!wsUrl) {
      setWsStatus({ tested: true, connected: false, error: "NEXT_PUBLIC_WS_URL тохируулаагүй", latencyMs: null })
      return
    }

    const started = performance.now()
    try {
      const ws = new WebSocket(`${wsUrl}/ws/signals`)
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error("Timeout: 5 секундэд холбогдож чадсангүй"))
        }, 5000)

        ws.onopen = () => {
          clearTimeout(timeout)
          const latency = Math.round(performance.now() - started)
          setWsStatus({ tested: true, connected: true, error: null, latencyMs: latency })
          ws.close()
          resolve()
        }

        ws.onerror = () => {
          clearTimeout(timeout)
          reject(new Error("WebSocket холболт амжилтгүй"))
        }

        ws.onclose = (e) => {
          if (!e.wasClean && e.code !== 1000) {
            clearTimeout(timeout)
            reject(new Error(`WebSocket хаагдсан: ${e.code} ${e.reason || ""}`))
          }
        }
      })
    } catch (err: any) {
      setWsStatus({ tested: true, connected: false, error: err.message, latencyMs: null })
    }
  }, [wsUrl])

  // Check for duplicate signals
  const checkDuplicates = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/signals?limit=100")
      if (!res.ok) return

      const data = await res.json()
      const signals = data.signals || data || []

      // Group by symbol+tf+direction+entry+sl+tp
      const groups: Record<string, { count: number; timestamps: string[] }> = {}
      
      for (const sig of signals) {
        const key = `${sig.symbol}|${sig.tf}|${sig.direction}|${sig.entry}|${sig.sl}|${sig.tp}`
        if (!groups[key]) {
          groups[key] = { count: 0, timestamps: [] }
        }
        groups[key].count++
        if (sig.timestamp) {
          groups[key].timestamps.push(sig.timestamp)
        }
      }

      // Find duplicates (count > 1)
      const dups: SignalDuplicate[] = []
      for (const [key, val] of Object.entries(groups)) {
        if (val.count > 1) {
          dups.push({ key, count: val.count, timestamps: val.timestamps.slice(0, 5) })
        }
      }

      setDuplicates(dups.sort((a, b) => b.count - a.count).slice(0, 10))
    } catch {
      // ignore
    }
  }, [])

  // Check backend health
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/health")
      if (!res.ok) {
        setBackendHealth({ ok: false, error: `HTTP ${res.status}` })
        return
      }
      const data = await res.json()
      setBackendHealth({
        ok: data.ok ?? false,
        uptime_s: data.uptime_s,
        signals_count: data.signals_lines_estimate,
        cache_ready: data.cache?.ready,
        symbols_count: data.cache?.symbols,
      })
    } catch (err: any) {
      setBackendHealth({ ok: false, error: err.message })
    }
  }, [])

  // Analyze and generate issues
  const analyzeIssues = useCallback(() => {
    const newIssues: DiagnosticIssue[] = []

    // WebSocket issues
    if (wsStatus.tested && !wsStatus.connected) {
      newIssues.push({
        id: "ws-not-connected",
        severity: "error",
        title: "WebSocket холбогдоогүй",
        description: wsStatus.error || "WebSocket серверт холбогдож чадсангүй",
        suggestion: wsUrl 
          ? "1. Nginx дээр WebSocket proxy тохиргоо шалгах\n2. Backend /ws/signals endpoint ажиллаж байгаа эсэхийг шалгах\n3. SSL certificate шалгах"
          : "Vercel Settings → Environment Variables → NEXT_PUBLIC_WS_URL=wss://api.jkmcopilot.com нэмээд redeploy хий"
      })
    }

    // Duplicate signals
    if (duplicates.length > 0) {
      newIssues.push({
        id: "duplicate-signals",
        severity: "warning",
        title: `${duplicates.length} төрлийн давтагдсан setup`,
        description: `Ижил entry/sl/tp-тай setup-ууд олон удаа бүртгэгдсэн: ${duplicates.map(d => d.key.split("|")[0]).join(", ")}`,
        suggestion: "Backend cooldown логик шалгах. scanner_service.py дотор deduplication зөв ажиллаж байгаа эсэхийг шалгах"
      })
    }

    // Backend health issues
    if (backendHealth && !backendHealth.ok) {
      newIssues.push({
        id: "backend-unhealthy",
        severity: "error",
        title: "Backend ажиллахгүй байна",
        description: backendHealth.error || "Backend health check амжилтгүй",
        suggestion: "VPS дээр docker logs jkm_bot_backend шалгах"
      })
    }

    if (backendHealth && !backendHealth.cache_ready) {
      newIssues.push({
        id: "cache-not-ready",
        severity: "warning",
        title: "Cache бэлэн биш",
        description: "Market data cache ачаалагдаагүй",
        suggestion: "Backend restart хийх: docker compose restart"
      })
    }

    // API endpoint failures
    const failedRequired = results.filter(r => r.required && !r.ok)
    for (const r of failedRequired) {
      newIssues.push({
        id: `endpoint-${r.name}`,
        severity: "error",
        title: `${r.name} endpoint ажиллахгүй`,
        description: r.error || r.reason,
        suggestion: r.url.includes("billing") 
          ? "Billing service тохируулаагүй бол хэвийн"
          : "Backend ажиллаж байгаа эсэх болон proxy тохиргоог шалгах"
      })
    }

    // Environment variable checks
    if (!wsUrl) {
      newIssues.push({
        id: "env-ws-missing",
        severity: "info",
        title: "NEXT_PUBLIC_WS_URL тохируулаагүй",
        description: "WebSocket real-time холболт ажиллахгүй, polling ашиглана",
        suggestion: "Vercel Settings → Environment Variables → NEXT_PUBLIC_WS_URL=wss://api.jkmcopilot.com"
      })
    }

    setIssues(newIssues)
  }, [wsStatus, duplicates, backendHealth, results, wsUrl])

  const run = useCallback(async () => {
    setRunning(true)
    setCopied(false)
    setIssues([])

    const checks: Array<[string, string, boolean]> = [
      // Required endpoints
      ["Proxy: /health", "/api/proxy/health", true],
      ["Proxy: /signals", "/api/proxy/signals?limit=1", true],
      ["Proxy: /engine/status", "/api/proxy/engine/status", true],
      ["Billing: /api/billing/status", "/api/billing/status", false],
      // Diagnostics
      ["Backend OpenAPI (optional)", "/api/proxy/openapi", false],
      // Optional - backend may not implement these
      ["Proxy: /ping (optional)", "/api/proxy/ping", false],
      ["Proxy: /symbols (optional)", "/api/proxy/symbols", false],
      ["Proxy: /metrics (optional)", "/api/proxy/metrics", false],
      ["Proxy: /strategies (optional)", "/api/proxy/strategies", false],
      ["Proxy: /profile (optional)", "/api/proxy/profile", false],
    ]

    // Run all checks in parallel
    const [checkResults] = await Promise.all([
      Promise.all(checks.map(([name, url, required]) => 
        runCheck(name, url).then(r => ({ ...r, required }))
      )),
      testWebSocket(),
      checkDuplicates(),
      checkBackendHealth(),
    ])

    setResults(checkResults)
    setRunning(false)
  }, [testWebSocket, checkDuplicates, checkBackendHealth])

  // Analyze issues when data changes
  useEffect(() => {
    if (!running && results.length > 0) {
      analyzeIssues()
    }
  }, [running, results, wsStatus, duplicates, backendHealth, analyzeIssues])

  useEffect(() => {
    run()
  }, [run])

  const hasFailures = useMemo(() => results.some((r) => r.required && !r.ok), [results])
  const hasIssues = issues.length > 0
  const errorCount = issues.filter(i => i.severity === "error").length
  const warningCount = issues.filter(i => i.severity === "warning").length

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
        NEXT_PUBLIC_API_URL: apiUrl ?? null,
      },
      diagnostics: {
        websocket: wsStatus,
        backendHealth,
        duplicateSignals: duplicates,
        issuesFound: issues,
      },
      checks: results,
    }
    return JSON.stringify(payload, null, 2)
  }, [results, userEmail, wsUrl, apiUrl, wsStatus, backendHealth, duplicates, issues])

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
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Засварын газар
            </span>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> {errorCount} алдаа
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" /> {warningCount} анхааруулга
                </Badge>
              )}
              {!hasIssues && !running && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle className="h-3 w-3" /> Бүгд OK
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Бүх асуудлыг автоматаар илрүүлнэ. Copy report товч дарж надад явуул.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Quick Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">WebSocket</div>
              <div className="flex items-center gap-2 mt-1">
                {wsStatus.connected ? (
                  <><Wifi className="h-4 w-4 text-emerald-500" /> <span className="text-sm text-emerald-600">Холбогдсон</span></>
                ) : wsStatus.tested ? (
                  <><WifiOff className="h-4 w-4 text-red-500" /> <span className="text-sm text-red-600">Холбогдоогүй</span></>
                ) : (
                  <span className="text-sm text-muted-foreground">Шалгаагүй</span>
                )}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Backend</div>
              <div className="flex items-center gap-2 mt-1">
                {backendHealth?.ok ? (
                  <><CheckCircle className="h-4 w-4 text-emerald-500" /> <span className="text-sm text-emerald-600">OK</span></>
                ) : backendHealth ? (
                  <><XCircle className="h-4 w-4 text-red-500" /> <span className="text-sm text-red-600">Алдаа</span></>
                ) : (
                  <span className="text-sm text-muted-foreground">Шалгаагүй</span>
                )}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Сигналууд</div>
              <div className="text-sm mt-1 font-mono">{backendHealth?.signals_count ?? "—"}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Давтагдсан</div>
              <div className="flex items-center gap-2 mt-1">
                {duplicates.length > 0 ? (
                  <><AlertTriangle className="h-4 w-4 text-yellow-500" /> <span className="text-sm text-yellow-600">{duplicates.length} төрөл</span></>
                ) : (
                  <span className="text-sm text-emerald-600">Байхгүй</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={run} disabled={running} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Шалгаж байна…" : "Дахин шалгах"}
            </Button>
            <Button type="button" onClick={copyReport} disabled={running || results.length === 0} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              {copied ? "Хууллаа ✓" : "Copy report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues - Main focus */}
      {issues.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Илэрсэн асуудлууд ({issues.length})
            </CardTitle>
            <CardDescription>
              Эдгээр асуудлуудыг засах шаардлагатай
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`border rounded-lg p-4 ${
                  issue.severity === "error" 
                    ? "border-red-500/30 bg-red-500/5" 
                    : issue.severity === "warning"
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {issue.severity === "error" ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : issue.severity === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-sm text-muted-foreground">{issue.description}</div>
                    <div className="text-sm bg-muted/50 rounded p-2 font-mono whitespace-pre-wrap">
                      💡 {issue.suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Duplicate Signals Details */}
      {duplicates.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Давтагдсан setup-ууд
            </CardTitle>
            <CardDescription>
              Ижил entry/sl/tp-тай setup-ууд олон удаа бүртгэгдсэн
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {duplicates.map((dup) => {
                const [symbol, tf, direction] = dup.key.split("|")
                return (
                  <div key={dup.key} className="flex items-center justify-between border rounded p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium">{symbol}</span>
                      <Badge variant="outline">{tf}</Badge>
                      <Badge variant={direction === "BUY" ? "default" : "destructive"}>{direction}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{dup.count}x давтагдсан</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Тохиргоо</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">User</span>
              <span className="font-mono">{userEmail || "—"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">NEXT_PUBLIC_WS_URL</span>
              <span className="font-mono text-xs">{wsUrl || <span className="text-yellow-600">(тохируулаагүй)</span>}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">NEXT_PUBLIC_API_URL</span>
              <span className="font-mono text-xs">{apiUrl || "(default)"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Backend uptime</span>
              <span className="font-mono">{backendHealth?.uptime_s ? `${Math.floor(backendHealth.uptime_s / 60)}m ${backendHealth.uptime_s % 60}s` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cache symbols</span>
              <span className="font-mono">{backendHealth?.symbols_count ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint-үүд</CardTitle>
          <CardDescription>Бүх endpoint-уудын статус</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((r) => (
              <div
                key={r.name}
                className={`border rounded-lg p-3 ${
                  !r.ok && r.required 
                    ? "border-red-500/30 bg-red-500/5" 
                    : !r.ok 
                      ? "opacity-60" 
                      : "border-emerald-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm">{r.name}</span>
                  <span
                    className={`text-xs border rounded px-2 py-0.5 ${
                      r.ok
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : r.required
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.ok ? "OK" : r.required ? "FAIL" : "N/A"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground break-all">{r.url}</div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span>Status: <span className="font-mono">{r.status ?? "—"}</span></span>
                  <span>Latency: <span className="font-mono">{r.latencyMs ?? "—"}ms</span></span>
                </div>
                {r.error && (
                  <div className="mt-2 text-xs text-red-500 break-all">{r.reason}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Report */}
      <Card>
        <CardHeader>
          <CardTitle>Copy/Paste</CardTitle>
          <CardDescription>Доорхыг бүхэлд нь хуулж надад явуул.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap break-words text-xs font-mono rounded-md border p-3 max-h-96 overflow-auto">{reportText}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
