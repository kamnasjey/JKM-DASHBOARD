import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Нэвтрээгүй байна" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        image: true,
        provider: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Хэрэглэгч олдсонгүй" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[API] /api/me error:", error)
    return NextResponse.json(
      { error: "Алдаа гарлаа" },
      { status: 500 }
    )
  }
}
