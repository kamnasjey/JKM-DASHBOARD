import { json } from "@/lib/proxy-auth"

export const runtime = "nodejs"

// Backend URL for prices (Python backend)
const BACKEND_URL = process.env.JKM_BOT_API || "https://api.jkmcopilot.com"

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/prices`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Fast timeout for price polling
      signal: AbortSignal.timeout(5000),
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
    console.error("[prices proxy] error:", err.message)
    return json(500, {
      ok: false,
      message: err.message || "Failed to fetch prices",
    })
  }
}
