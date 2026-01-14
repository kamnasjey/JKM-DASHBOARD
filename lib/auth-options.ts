import type { NextAuthOptions, User as NextAuthUser } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/db"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

// Mask email for logs: a***@domain.com
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  return `${local[0]}***@${domain}`
}

// Mask phone for logs: 99****12
function maskPhone(phone: string): string {
  if (phone.length < 4) return "****"
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // Email + Password credentials
    CredentialsProvider({
      id: "email-password",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email болон нууц үг оруулна уу")
        }

        const email = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user || !user.passwordHash) {
          console.log(`[Auth] Email login failed - not found: ${maskEmail(email)}`)
          throw new Error("Хэрэглэгч олдсонгүй эсвэл нууц үг буруу")
        }

        const valid = await compare(credentials.password, user.passwordHash)
        if (!valid) {
          console.log(`[Auth] Email login failed - wrong password: ${maskEmail(email)}`)
          throw new Error("Нууц үг буруу байна")
        }

        console.log(`[Auth] Email login success: ${maskEmail(email)}`)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        } as NextAuthUser
      },
    }),

    // Phone + OTP credentials
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error("Утасны дугаар болон OTP код оруулна уу")
        }

        const phone = credentials.phone.replace(/\D/g, "")
        const otp = credentials.otp.trim()

        // MVP: Accept "123456" as valid OTP
        // TODO: Replace with real OTP verification via SMS provider
        if (otp !== "123456") {
          console.log(`[Auth] OTP verify failed - wrong code: ${maskPhone(phone)}`)
          throw new Error("OTP код буруу байна")
        }

        // Find or create user by phone
        let user = await prisma.user.findUnique({ where: { phone } })

        if (!user) {
          user = await prisma.user.create({
            data: {
              phone,
              provider: "phone",
            },
          })
          console.log(`[Auth] Phone user created: ${maskPhone(phone)}`)
        } else {
          console.log(`[Auth] Phone login success: ${maskPhone(phone)}`)
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? `User ${phone.slice(-4)}`,
          image: user.image,
        } as NextAuthUser
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth - upsert user by email (unique constraint)
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase().trim()

        try {
          await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              provider: "google",
            },
            create: {
              email,
              name: user.name,
              image: user.image,
              provider: "google",
            },
          })
          console.log(`[Auth] Google login upsert: ${maskEmail(email)}`)
        } catch (err) {
          // IMPORTANT:
          // Returning false here causes NextAuth to redirect with ?error=AccessDenied,
          // which looks like Google auth is broken. In production, this most commonly
          // happens when DATABASE_URL is missing/invalid or SQLite is not writable.
          // We allow OAuth login to proceed and treat DB persistence as best-effort.
          console.error(`[Auth] Google upsert error (allowing sign-in to proceed):`, err)
          return true
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }

      // For Google auth, lookup DB user to get correct ID
      if (account?.provider === "google" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: (token.email as string).toLowerCase().trim() },
          })

          // Best-effort Firebase user doc upsert (non-blocking).
          // This keeps user-related domain data centralized in Firestore while keeping
          // existing Prisma auth/billing intact.
          const userDataProvider = (process.env.USER_DATA_PROVIDER || "").toLowerCase()
          const shouldSync = userDataProvider === "firebase"
          if (shouldSync && token.id && !(token as any).firebaseSynced) {
            try {
              const db = getFirebaseAdminDb()
              const id = String(token.id)
              await db
                .collection("users")
                .doc(id)
                .set(
                  {
                    user_id: id,
                    email: token.email ? String(token.email).toLowerCase().trim() : null,
                    name: token.name ? String(token.name) : null,
                    image: (token as any).picture ? String((token as any).picture) : null,
                    provider: account?.provider ? String(account.provider) : null,
                    lastLoginAt: new Date().toISOString(),
                  },
                  { merge: true },
                )
              ;(token as any).firebaseSynced = true
            } catch (err) {
              console.error("[Auth] Firestore user upsert failed (continuing):", err)
            }
          }
          if (dbUser) {
            token.id = dbUser.id
          }
        } catch (err) {
          console.error("[Auth] Google jwt DB lookup failed (continuing):", err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
}
