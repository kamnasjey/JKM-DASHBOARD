import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/app/:path*",
    "/signals/:path*",
    "/strategies/:path*",
    "/profile/:path*",
    "/risk/:path*",
    "/journey/:path*",
    "/admin/:path*",
  ],
}
