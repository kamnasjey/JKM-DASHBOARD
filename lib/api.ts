/**
 * All protected API calls go through /api/proxy/* endpoints.
 * The Next.js server verifies the NextAuth session and forwards
 * requests to the backend with the internal API key.
 */

export interface ApiError {
  message: string
  status: number
}

function toMessage(text: string): string {
  return text.replace(/^"|"$/g, "").trim()
}

// Fetch wrapper
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  try {
    const response = await fetch(path, { ...options, headers })

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
      throw new Error("Unauthorized")
    }

    if (response.status === 402) {
      if (typeof window !== "undefined") {
        window.location.href = "/billing"
      }
      throw new Error("Төлбөр шаардлагатай")
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? ""
      const rawText = await response.text()

      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(rawText)

          const candidate =
            (data && typeof data === "object" &&
              ((data as any).message ?? (data as any).error ?? (data as any).detail)) ||
            (typeof data === "string" ? data : null)

          if (candidate) {
            if (typeof candidate === "string") throw new Error(candidate)
            if (typeof candidate === "number" || typeof candidate === "boolean") {
              throw new Error(String(candidate))
            }
            // Object/array detail
            throw new Error(JSON.stringify(candidate))
          }

          // If backend returned JSON but no message fields, show something meaningful.
          throw new Error(`API Error (${response.status}): ${rawText || "Unknown"}`)
        } catch {
          // fall through to plain text
        }
      }

      const msg = toMessage(rawText)
      throw new Error(msg || `API Error (${response.status}) ${response.statusText}`)
    }

    return response.json()
  } catch (err: any) {
    if (err.message === "Failed to fetch" || err instanceof TypeError) {
      console.warn("[api] Network error:", path)
    }
    throw err
  }
}

export const api = {
  // Metrics
  getMetrics: () => apiFetch<any>("/api/proxy/metrics"),
  metrics: () => apiFetch<any>("/api/proxy/metrics"),

  // Signals
  getSignals: (params?: { limit?: number; symbol?: string }) => {
    const qs = new URLSearchParams()
    qs.set("limit", String(params?.limit ?? 50))
    if (params?.symbol) qs.set("symbol", params.symbol)
    return apiFetch<any[]>(`/api/proxy/signals?${qs.toString()}`)
  },
  signals: (params?: { limit?: number; symbol?: string }) => api.getSignals(params),

  // Symbols
  getSymbols: () => apiFetch<string[]>("/api/proxy/symbols"),
  symbols: () => api.getSymbols(),

  // Strategies
  getStrategies: () => apiFetch<any>("/api/proxy/strategies"),
  strategies: () => api.getStrategies(),
  updateStrategies: (data: any) =>
    apiFetch("/api/proxy/strategies", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Logs
  getLogs: () => apiFetch<string[]>("/api/proxy/log"),
  logs: () => api.getLogs(),

  // Health (public)
  getHealth: () => apiFetch<{ status: string }>("/api/proxy/health"),
  health: () => api.getHealth(),

  // Annotations
  annotations: (symbol: string) =>
    apiFetch<any>(`/api/proxy/annotations?symbol=${encodeURIComponent(symbol)}`),

  // Profile
  profile: () => apiFetch<any>("/api/proxy/profile"),
  updateProfile: (payload: any) =>
    apiFetch<any>("/api/proxy/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Engine controls
  engineStatus: () => apiFetch<any>("/api/proxy/engine/status"),
  manualScan: () => apiFetch<any>("/api/proxy/engine/manual-scan", { method: "POST" }),
  startScan: () => apiFetch<any>("/api/proxy/engine/start", { method: "POST" }),
  stopScan: () => apiFetch<any>("/api/proxy/engine/stop", { method: "POST" }),

  // Admin backfill
  backfill: (payload: any) =>
    apiFetch<any>("/api/proxy/admin/backfill", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Signal detail
  signalDetail: (id: string) => apiFetch<any>(`/api/proxy/signals/${id}`),

  // Candles for charting
  candles: (symbol: string, tf: string = "M5", limit: number = 200) =>
    apiFetch<any>(`/api/proxy/markets/${encodeURIComponent(symbol)}/candles?tf=${tf}&limit=${limit}`),

  // Detectors list
  detectors: () => apiFetch<any>("/api/proxy/detectors"),
}
