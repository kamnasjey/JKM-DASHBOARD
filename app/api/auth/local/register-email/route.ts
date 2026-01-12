import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email болон нууц үг шаардлагатай" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Энэ email хаяг бүртгэлтэй байна" },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        passwordHash,
        provider: "email",
      },
    })

    // Mask email in response
    const maskedEmail = `${normalizedEmail[0]}***@${normalizedEmail.split("@")[1]}`
    console.log(`[Auth] Email register success: ${maskedEmail}`)

    return NextResponse.json({
      success: true,
      message: "Бүртгэл амжилттай",
      userId: user.id,
    })
  } catch (error) {
    console.error("[Auth] Register error:", error)
    return NextResponse.json(
      { error: "Бүртгэл хийхэд алдаа гарлаа" },
      { status: 500 }
    )
  }
}
