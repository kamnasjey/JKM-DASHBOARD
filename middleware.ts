import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
)

export const config = {
  // Protect dashboard and app routes, but not public routes
  matcher: [
    "/dashboard/:path*",
    "/app/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/billing/:path*",
    "/repair/:path*",
  ],
}
