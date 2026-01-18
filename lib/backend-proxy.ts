// Backend origin can be overridden via env for staging/dev environments
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.jkmcopilot.com"

function missingEnvResponse(name: string): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      message: `Missing required env var: ${name}`,
    }),
    {
      status: 500,
      headers: { "content-type": "application/json" },
    },
  )
}

export async function forwardInternalRequest(
  request: Request,
  opts: {
    method: "GET" | "POST" | "PUT" | "DELETE"
    path: string
    /** Pre-read body - if provided, skips reading from request (avoids "body already read" error) */
    body?: string
  },
): Promise<Response> {
  const key = process.env.INTERNAL_API_KEY || process.env.BACKEND_INTERNAL_API_KEY
  if (!key) return missingEnvResponse("INTERNAL_API_KEY or BACKEND_INTERNAL_API_KEY")

  const url = `${BACKEND_ORIGIN}${opts.path}`

  const headers = new Headers()
  headers.set("x-internal-api-key", key)
  headers.set("accept", "application/json")

  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)

  const init: RequestInit = {
    method: opts.method,
    headers,
  }

  if (opts.method !== "GET") {
    // Use pre-read body if provided, otherwise read from request
    if (opts.body !== undefined) {
      init.body = opts.body
      // Ensure content-type is set for JSON body
      if (!contentType) {
        headers.set("content-type", "application/json")
      }
    } else {
      const text = await request.text()
      if (text) init.body = text
    }
  }

  try {
    const response = await fetch(url, init)
    const responseHeaders = new Headers()
    responseHeaders.set(
      "content-type",
      response.headers.get("content-type") ?? "application/json",
    )

    const bodyText = await response.text()

    // If the backend returns an error without a helpful message (e.g. `{}`),
    // wrap it so the UI can show something actionable.
    if (!response.ok) {
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase()

      const wrap = (message: string, detail?: unknown) => {
        const payload: Record<string, unknown> = { ok: false, message }
        if (detail !== undefined) payload.detail = detail
        return new Response(JSON.stringify(payload), {
          status: response.status,
          headers: { "content-type": "application/json" },
        })
      }

      if (!bodyText) {
        return wrap(`Backend error (${response.status})`)
      }

      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(bodyText)
          const msg =
            (data && typeof data === "object" &&
              ((data as any).message ?? (data as any).error ?? (data as any).detail)) ||
            (typeof data === "string" ? data : null)

          if (msg) {
            // Keep backend message intact.
            return new Response(bodyText, {
              status: response.status,
              headers: responseHeaders,
            })
          }

          return wrap(`Backend error (${response.status})`, data)
        } catch {
          return wrap(`Backend error (${response.status})`, bodyText)
        }
      }

      return wrap(`Backend error (${response.status})`, bodyText)
    }

    return new Response(bodyText, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Failed to reach backend",
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    )
  }
}
