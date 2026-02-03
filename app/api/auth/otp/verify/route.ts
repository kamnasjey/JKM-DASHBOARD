import { NextResponse } from "next/server"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { seedStarterStrategiesForUser } from "@/lib/user-data/starter-strategies"
import { randomUUID } from "crypto"

export const runtime = "nodejs"

// MVP: Accept "123456" as valid OTP
// TODO: Compare against stored otpHash for production

const OTP_COLLECTION = "otp-challenges"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, otp, name, plan } = body

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Утасны дугаар болон OTP код шаардлагатай" },
        { status: 400 }
      )
    }

    const normalizedPhone = phone.replace(/\D/g, "")
    const trimmedOtp = otp.trim()

    // MVP: Fixed OTP check
    // TODO: For production, verify against otpHash in database
    if (trimmedOtp !== "123456") {
      const maskedPhone = `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
      console.log(`[Auth] OTP verify failed: ${maskedPhone}`)

      return NextResponse.json(
        { error: "OTP код буруу байна" },
        { status: 401 }
      )
    }

    const db = getFirebaseAdminDb()

    // Find user by phone in Firestore
    const userSnapshot = await db
      .collection("users")
      .where("phone", "==", normalizedPhone)
      .limit(1)
      .get()

    let userId: string
    let isNewUser = false

    if (userSnapshot.empty) {
      // Create new user with phone
      userId = randomUUID()
      const userPlan = plan || "free"
      const hasPaidAccess = false // Always false until admin approves
      await db.collection("users").doc(userId).set({
        user_id: userId,
        phone: normalizedPhone,
        name: name?.trim() || null,
        provider: "phone",
        plan: userPlan,
        planStatus: userPlan === "free" ? "active" : "pending",
        hasPaidAccess,
        has_paid_access: hasPaidAccess,
        createdAt: new Date().toISOString(),
      })
      isNewUser = true

      // Seed starter strategies for new user
      try {
        await seedStarterStrategiesForUser(db, userId)
      } catch (seedErr) {
        console.error("[Auth] Starter strategies seed failed:", seedErr)
      }
    } else {
      // Use existing user
      const userDoc = userSnapshot.docs[0]
      userId = userDoc.id

      // Update name if provided and user doesn't have one
      const userData = userDoc.data()
      if (name && !userData.name) {
        await db.collection("users").doc(userId).update({
          name: name.trim(),
        })
      }
    }

    // Clean up used OTP challenges
    const challengeSnapshot = await db
      .collection(OTP_COLLECTION)
      .where("phone", "==", normalizedPhone)
      .get()

    const batch = db.batch()
    challengeSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()

    const maskedPhone = `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
    console.log(`[Auth] OTP verify success: ${maskedPhone}${isNewUser ? " (new user)" : ""}`)

    return NextResponse.json({
      success: true,
      message: "Баталгаажуулалт амжилттай",
      userId,
      phone: normalizedPhone,
    })
  } catch (error) {
    console.error("[Auth] OTP verify error:", error)
    return NextResponse.json(
      { error: "Баталгаажуулахад алдаа гарлаа" },
      { status: 500 }
    )
  }
}
