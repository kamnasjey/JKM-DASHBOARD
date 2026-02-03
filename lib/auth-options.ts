import type { NextAuthOptions, User as NextAuthUser } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { seedStarterStrategiesForUser } from "@/lib/user-data/starter-strategies"

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

// Helper to find user by email in Firestore
async function findUserByEmail(email: string) {
  const db = getFirebaseAdminDb()
  const snapshot = await db
    .collection("users")
    .where("email", "==", email.toLowerCase().trim())
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

// Helper to find user by phone in Firestore
async function findUserByPhone(phone: string) {
  const db = getFirebaseAdminDb()
  const snapshot = await db
    .collection("users")
    .where("phone", "==", phone)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // Email + Password credentials (Firestore)
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
        const user = await findUserByEmail(email)

        if (!user || !user.passwordHash) {
          console.log(`[Auth] Email login failed - not found: ${maskEmail(email)}`)
          throw new Error("Хэрэглэгч олдсонгүй эсвэл нууц үг буруу")
        }

        const valid = await compare(credentials.password, user.passwordHash as string)
        if (!valid) {
          console.log(`[Auth] Email login failed - wrong password: ${maskEmail(email)}`)
          throw new Error("Нууц үг буруу байна")
        }

        console.log(`[Auth] Email login success: ${maskEmail(email)}`)
        return {
          id: user.id,
          email: user.email as string,
          name: user.name as string | null,
          image: user.image as string | null,
        } as NextAuthUser
      },
    }),

    // Phone + OTP credentials (Firestore)
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

        const db = getFirebaseAdminDb()
        let user = await findUserByPhone(phone)

        if (!user) {
          // Create new user with phone
          const { randomUUID } = await import("crypto")
          const userId = randomUUID()

          await db.collection("users").doc(userId).set({
            user_id: userId,
            phone,
            provider: "phone",
            createdAt: new Date().toISOString(),
          })

          console.log(`[Auth] Phone user created: ${maskPhone(phone)}`)

          // Seed starter strategies
          try {
            await seedStarterStrategiesForUser(db, userId)
          } catch (seedErr) {
            console.error("[Auth] Starter strategies seed failed:", seedErr)
          }

          user = { id: userId, phone, name: null, email: null, image: null }
        } else {
          console.log(`[Auth] Phone login success: ${maskPhone(phone)}`)
        }

        return {
          id: user.id,
          email: user.email as string | null,
          name: (user.name as string | null) ?? `User ${phone.slice(-4)}`,
          image: user.image as string | null,
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
      // Handle Google OAuth - upsert user in Firestore
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase().trim()

        try {
          const db = getFirebaseAdminDb()
          const existingUser = await findUserByEmail(email)

          if (existingUser) {
            // Update existing user
            await db.collection("users").doc(existingUser.id).set(
              {
                name: user.name ?? undefined,
                image: user.image ?? undefined,
                provider: "google",
                lastLoginAt: new Date().toISOString(),
              },
              { merge: true }
            )
            // Store the Firestore doc ID for jwt callback
            ;(user as any).firestoreId = existingUser.id
            console.log(`[Auth] Google login update: ${maskEmail(email)}`)
          } else {
            // Create new user with Google providerAccountId as stable ID
            const userId = `google_${account.providerAccountId}`
            await db.collection("users").doc(userId).set({
              user_id: userId,
              email,
              name: user.name,
              image: user.image,
              provider: "google",
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            })
            ;(user as any).firestoreId = userId
            console.log(`[Auth] Google user created: ${maskEmail(email)}`)

            // Seed starter strategies
            try {
              await seedStarterStrategiesForUser(db, userId)
            } catch (seedErr) {
              console.error("[Auth] Starter strategies seed failed:", seedErr)
            }
          }
        } catch (err) {
          console.error(`[Auth] Google Firestore error (allowing sign-in):`, err)
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        // Use Firestore ID if available, otherwise use user.id
        token.id = (user as any).firestoreId || user.id
      }

      // For Google auth on subsequent requests, ensure we have Firestore ID
      if (account?.provider === "google" && token.email && !token.id) {
        try {
          const existingUser = await findUserByEmail(token.email as string)
          if (existingUser) {
            token.id = existingUser.id
          } else {
            // Fallback to providerAccountId-based ID
            token.id = `google_${account.providerAccountId}`
          }
        } catch (err) {
          console.error("[Auth] JWT Firestore lookup failed:", err)
          token.id = `google_${account.providerAccountId}`
        }
      }

      // Update lastLoginAt in Firestore (best-effort, non-blocking)
      if (token.id && !(token as any).firebaseSynced) {
        try {
          const db = getFirebaseAdminDb()
          await db
            .collection("users")
            .doc(String(token.id))
            .set(
              {
                lastLoginAt: new Date().toISOString(),
              },
              { merge: true }
            )
          ;(token as any).firebaseSynced = true
        } catch (err) {
          console.error("[Auth] Firestore lastLogin update failed:", err)
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
