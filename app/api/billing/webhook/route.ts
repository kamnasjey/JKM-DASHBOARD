import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: Request) {
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

      const db = getFirebaseAdminDb()
      await db.collection("users").doc(userId).set(
        {
          hasPaidAccess: true,
          has_paid_access: true,
          paidAt: new Date().toISOString(),
          stripeCustomerId: customerId ?? null,
          stripeCheckoutId: session.id,
        },
        { merge: true }
      )

      console.log(`[stripe] Access unlocked for user ${userId}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[stripe] webhook handler error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
