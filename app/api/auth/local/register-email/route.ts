import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { seedStarterStrategiesForUser } from "@/lib/user-data/starter-strategies"
import { randomUUID } from "crypto"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, plan } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email болон нууц үг шаардлагатай" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const db = getFirebaseAdminDb()

    // Check if email already exists in Firestore
    const existingSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "Энэ email хаяг бүртгэлтэй байна" },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Generate user ID
    const userId = randomUUID()

    // Determine plan and access
    const userPlan = plan || "starter"
    const hasPaidAccess = false // Always false until admin approves

    // Create user in Firestore
    await db.collection("users").doc(userId).set({
      user_id: userId,
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      provider: "email",
      plan: userPlan,
      planStatus: userPlan === "starter" ? "active" : "pending",
      hasPaidAccess,
      has_paid_access: hasPaidAccess,
      createdAt: new Date().toISOString(),
    })

    // Mask email in response
    const maskedEmail = `${normalizedEmail[0]}***@${normalizedEmail.split("@")[1]}`
    console.log(`[Auth] Email register success: ${maskedEmail}`)

    // Seed starter strategies for new user
    try {
      await seedStarterStrategiesForUser(db, userId)
      console.log(`[Auth] Starter strategies seeded for: ${maskedEmail}`)
    } catch (seedErr) {
      console.error(`[Auth] Starter strategies seed failed (will retry on login):`, seedErr)
    }

    return NextResponse.json({
      success: true,
      message: "Бүртгэл амжилттай",
      userId,
    })
  } catch (error) {
    console.error("[Auth] Register error:", error)
    return NextResponse.json(
      { error: "Бүртгэл хийхэд алдаа гарлаа" },
      { status: 500 }
    )
  }
}
