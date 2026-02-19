import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const CANONICAL_HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST || process.env.CANONICAL_HOST || "www.jkmcopilot.com"

const PROTECTED_PREFIXES = ["/dashboard", "/app", "/profile", "/admin", "/billing", "/repair"] as const

function shouldSkipCanonicalRedirect(hostname: string): boolean {
  if (!hostname) return true
  if (hostname === "localhost" || hostname === "127.0.0.1") return true
  if (hostname.endsWith(".local")) return true
  return false
}

function needsCanonicalRedirect(hostname: string): boolean {
  if (shouldSkipCanonicalRedirect(hostname)) return false
  if (hostname === CANONICAL_HOST) return false
  if (hostname.endsWith(".vercel.app")) return true
  if (hostname === "jkmcopilot.com") return true
  return hostname !== CANONICAL_HOST
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname

    // Redirect /app/* beta zone to production /dashboard
    if (pathname === "/app" || pathname.startsWith("/app/")) {
      const url = req.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url, 308)
    }

    const hostname = req.nextUrl.hostname
    if (needsCanonicalRedirect(hostname)) {
      const url = req.nextUrl.clone()
      url.protocol = "https:"
      url.hostname = CANONICAL_HOST
      return NextResponse.redirect(url, 308)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Never enforce NextAuth session checks on API routes.
        if (pathname.startsWith("/api/")) return true

        const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
        if (!isProtected) return true

        return !!token
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
)

export const config = {
  // Run on all routes so canonical redirect always applies.
  // Auth enforcement is handled in the `authorized` callback (only for protected prefixes).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
