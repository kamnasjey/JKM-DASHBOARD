import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// MVP: OTP is NOT sent via SMS. Returns success so frontend can proceed.
// TODO: Integrate Twilio/Vonage/MessageBird/local SMS gateway here

const OTP_EXPIRY_MINUTES = 5
const OTP_RATE_LIMIT_SECONDS = 60
const OTP_COLLECTION = "otp-challenges"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: "Утасны дугаар шаардлагатай" },
        { status: 400 }
      )
    }

    const normalizedPhone = phone.replace(/\D/g, "")

    if (normalizedPhone.length < 8) {
      return NextResponse.json(
        { error: "Утасны дугаар буруу байна" },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    const now = Date.now()
    const rateLimitTime = new Date(now - OTP_RATE_LIMIT_SECONDS * 1000).toISOString()

    // Rate limiting: check if recently requested
    const recentSnapshot = await db
      .collection(OTP_COLLECTION)
      .where("phone", "==", normalizedPhone)
      .where("createdAt", ">=", rateLimitTime)
      .limit(1)
      .get()

    if (!recentSnapshot.empty) {
      return NextResponse.json(
        { error: "OTP саяхан илгээсэн. Түр хүлээнэ үү." },
        { status: 429 }
      )
    }

    // Generate OTP (MVP: fixed "123456", production: random 6 digits)
    const otp = "123456" // TODO: For production: Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = await hash(otp, 10)

    // Store OTP challenge in Firestore
    await db.collection(OTP_COLLECTION).add({
      phone: normalizedPhone,
      otpHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    })

    // Mask phone in logs
    const maskedPhone = `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
    console.log(`[Auth] OTP requested for: ${maskedPhone} (MVP: code is 123456)`)

    // TODO: Send SMS here
    // await sendSMS(normalizedPhone, `Your JKM code is: ${otp}`)

    return NextResponse.json({
      success: true,
      message: "OTP код илгээгдлээ",
    })
  } catch (error) {
    console.error("[Auth] OTP request error:", error)
    return NextResponse.json(
      { error: "OTP илгээхэд алдаа гарлаа" },
      { status: 500 }
    )
  }
}
