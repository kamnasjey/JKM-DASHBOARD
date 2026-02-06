import { json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

// Backend URL for regime status (Python backend)
const BACKEND_URL = process.env.JKM_BOT_API || "http://159.65.11.255:8000"

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/regime-status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return json(response.status, {
        ok: false,
        message: `Backend error: ${response.status}`,
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("[regime-status proxy] error:", err.message)
    return json(500, {
      ok: false,
      message: err.message || "Failed to fetch regime status",
    })
  }
}
