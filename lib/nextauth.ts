import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export function getMissingAuthEnv(): string[] {
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"]
  return required.filter((key) => !process.env[key])
}

export function getAuthOptions(): NextAuthOptions {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  return {
    providers:
      clientId && clientSecret
        ? [
            GoogleProvider({
              clientId,
              clientSecret,
            }),
          ]
        : [],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async session({ session, token }) {
        if (session.user && token?.sub) {
          ;(session.user as any).id = token.sub
        }
        return session
      },
    },
  }
}
