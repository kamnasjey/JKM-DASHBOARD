import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/db"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id as string | undefined
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const priceId = process.env.STRIPE_PRICE_ID
  if (!process.env.STRIPE_SECRET_KEY || !priceId) {
    return NextResponse.json(
      { ok: false, message: "Billing is not configured" },
      { status: 500 }
    )
  }

  const appUrl = process.env.NEXTAUTH_URL
  if (!appUrl) {
    return NextResponse.json(
      { ok: false, message: "NEXTAUTH_URL is required" },
      { status: 500 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, hasPaidAccess: true, stripeCustomerId: true },
  })

  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 })
  }

  if (user.hasPaidAccess) {
    return NextResponse.json({ ok: true, alreadyPaid: true })
  }

  const stripe = getStripe()
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : (user.email ?? undefined),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
    },
  })

  // Store checkout id for traceability (optional)
  if (checkoutSession.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCheckoutId: checkoutSession.id },
    })
  }

  return NextResponse.json({ ok: true, url: checkoutSession.url })
}
