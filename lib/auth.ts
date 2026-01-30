/**
 * Firebase Auth utilities
 *
 * Provides ID token verification for API routes.
 */

import { getFirebaseAdminApp } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

/**
 * Verify a Firebase ID token and return the decoded token.
 * Returns null if verification fails.
 */
export async function verifyIdToken(token: string): Promise<{ uid: string } | null> {
  try {
    // Initialize Firebase Admin (if not already initialized)
    getFirebaseAdminApp()
    const auth = getAuth()
    const decoded = await auth.verifyIdToken(token)
    return { uid: decoded.uid }
  } catch (error) {
    console.error("[verifyIdToken] Failed to verify token:", error)
    return null
  }
}
