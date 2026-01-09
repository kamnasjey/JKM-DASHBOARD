function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

export async function GET() {
  return json(501, {
    ok: false,
    message: "Auth not enabled yet. Google login will be integrated later.",
  })
}

export async function POST() {
  return json(501, {
    ok: false,
    message: "Auth not enabled yet. Google login will be integrated later.",
  })
}
