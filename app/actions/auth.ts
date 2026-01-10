"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"

export async function signInWithGoogle() {
  try {
    await signIn("google", {
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "AccessDenied":
          return { error: "AccessDenied" }
        case "OAuthSignInError":
          return { error: "OAuthSignin" }
        default:
          return { error: "Configuration" }
      }
    }
    throw error
  }
}
