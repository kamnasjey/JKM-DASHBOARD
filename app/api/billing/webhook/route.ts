import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getPrisma, prismaAvailable } from "@/lib/db"

export const runtime = "nodejs"

// Helper to check if billing is disabled
function isBillingDisabled(): boolean {
  return process.env.BILLING_DISABLED === "1" || !prismaAvailable()
}

export async function POST(request: Request) {
  // Check if billing is disabled
  if (isBillingDisabled()) {
    return NextResponse.json(
      { ok: false, message: "Billing disabled (BILLING_DISABLED=1 or no DATABASE_URL)" },
      { status: 503 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, message: "Webhook not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing signature" }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: unknown) {
    console.error("[stripe] webhook signature verification failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = (session.client_reference_id ?? session.metadata?.userId) as string | undefined
      if (!userId) {
        console.warn("[stripe] checkout.session.completed missing userId")
        return NextResponse.json({ ok: true })
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id

      const prisma = getPrisma()
      if (!prisma) {
        console.error("[stripe] Prisma not available for user update")
        return NextResponse.json({ ok: false, message: "Database unavailable" }, { status: 503 })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          hasPaidAccess: true,
          paidAt: new Date(),
          stripeCustomerId: customerId ?? undefined,
          stripeCheckoutId: session.id,
        },
      })

      console.log(`[stripe] Access unlocked for user ${userId}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[stripe] webhook handler error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
