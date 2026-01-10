const BACKEND_ORIGIN = "https://api.jkmcopilot.com"

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
  },
): Promise<Response> {
  const key = process.env.BACKEND_INTERNAL_API_KEY
  if (!key) return missingEnvResponse("BACKEND_INTERNAL_API_KEY")

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
    const text = await request.text()
    if (text) init.body = text
  }

  try {
    const response = await fetch(url, init)
    const responseHeaders = new Headers()
    responseHeaders.set(
      "content-type",
      response.headers.get("content-type") ?? "application/json",
    )

    const bodyText = await response.text()
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
