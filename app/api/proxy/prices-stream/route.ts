import { NextRequest } from "next/server"

export const runtime = "nodejs"

// Backend URL for prices (Python backend)
const BACKEND_URL = process.env.JKM_BOT_API || "http://159.65.11.255:8000"

export async function GET(request: NextRequest) {
  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let isActive = true

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", () => {
        isActive = false
      })

      // Fetch prices every second and stream them
      const fetchAndStream = async () => {
        while (isActive) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/prices`, {
              method: "GET",
              headers: { "Accept": "application/json" },
              signal: AbortSignal.timeout(3000),
            })

            if (response.ok) {
              const data = await response.json()
              // Send as SSE format
              const message = `data: ${JSON.stringify(data)}\n\n`
              controller.enqueue(encoder.encode(message))
            }
          } catch (err: any) {
            // Send error event
            const errorMsg = `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
            controller.enqueue(encoder.encode(errorMsg))
          }

          // Wait 1 second before next fetch
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        controller.close()
      }

      fetchAndStream()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
