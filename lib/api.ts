// API client for JKM Trading AI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
const SESSION_KEY = "jkm_ai_session_v1"

export interface ApiError {
  message: string
  status: number
}

// Token management
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SESSION_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

// Fetch wrapper with auth
export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      clearToken()
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      }
      throw error
    }

    return response.json()
  } catch (err: any) {
    if (err.message === "Failed to fetch" || err instanceof TypeError) {
      console.error("[v0] Network error - is backend running at:", API_BASE_URL)
      throw new Error(
        `Backend API холбогдохгүй байна (${API_BASE_URL}). Backend server ажиллаж байгаа эсэхийг шалгана уу.`,
      )
    }
    throw err
  }
}

// Auth APIs
export const auth = {
  register: (data: {
    name: string
    email: string
    password: string
    telegram_handle?: string
    strategy_note?: string
  }) =>
    fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyCode: (data: { email: string; code: string }) =>
    fetchJson<{ token: string; user: any }>("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchJson<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => fetchJson<any>("/api/auth/me"),

  logout: () => fetchJson("/api/auth/logout", { method: "POST" }),
}

// Core APIs
export const api = {
  metrics: () => fetchJson<any>("/api/metrics"),

  signals: (params?: { limit?: number; symbol?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.symbol) query.set("symbol", params.symbol)
    return fetchJson<any[]>(`/api/signals?${query}`)
  },

  signalDetail: (signalId: string) => fetchJson<any>(`/api/signals/${signalId}`),

  symbols: () => fetchJson<string[]>("/api/markets/symbols"),

  candles: (symbol: string, params?: { tf?: string; limit?: number }) => {
    const query = new URLSearchParams()
    query.set("tf", params?.tf || "5m")
    query.set("limit", (params?.limit || 500).toString())
    return fetchJson<any[]>(`/api/markets/${symbol}/candles?${query}`)
  },

  annotations: (symbol: string) => fetchJson<any>(`/api/chart/annotations?symbol=${symbol}`),

  profile: () => fetchJson<any>("/api/profile"),

  updateProfile: (data: { command?: string; profile?: any }) =>
    fetchJson("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  strategies: () => fetchJson<any>("/api/strategies"),

  updateStrategies: (data: { strategies?: any[] } | any[]) =>
    fetchJson("/api/strategies", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Admin
  manualScan: () => fetchJson("/api/scan/manual", { method: "POST" }),
  startScan: () => fetchJson("/api/scan/start", { method: "POST" }),
  stopScan: () => fetchJson("/api/scan/stop", { method: "POST" }),
  health: () => fetchJson("/health"),
  logs: () => fetchJson<string[]>("/api/log"),
}
