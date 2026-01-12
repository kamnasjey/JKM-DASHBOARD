import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// MVP: Accept "123456" as valid OTP
// TODO: Compare against stored otpHash for production

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, otp, name } = body

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
      // Increment attempts in DB (optional for MVP)
      const maskedPhone = `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
      console.log(`[Auth] OTP verify failed: ${maskedPhone}`)

      return NextResponse.json(
        { error: "OTP код буруу байна" },
        { status: 401 }
      )
    }

    // Find or create user by phone (unique constraint)
    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: name?.trim() || null,
          provider: "phone",
        },
      })
    } else if (name && !user.name) {
      // Update name if provided and user doesn't have one
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      })
    }

    // Clean up used OTP challenges
    await prisma.otpChallenge.deleteMany({
      where: { phone: normalizedPhone },
    })

    const maskedPhone = `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
    console.log(`[Auth] OTP verify success: ${maskedPhone}`)

    return NextResponse.json({
      success: true,
      message: "Баталгаажуулалт амжилттай",
      userId: user.id,
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
