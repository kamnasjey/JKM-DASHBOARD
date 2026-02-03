import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST() {
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

  try {
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data() || {}

    // Check if already paid
    if (userData.hasPaidAccess === true || userData.has_paid_access === true) {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }

    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: userData.stripeCustomerId ?? undefined,
      customer_email: userData.stripeCustomerId ? undefined : (userData.email ?? (session.user as any).email ?? undefined),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    })

    // Store checkout id for traceability
    if (checkoutSession.id) {
      await db.collection("users").doc(userId).set(
        { stripeCheckoutId: checkoutSession.id },
        { merge: true }
      )
    }

    return NextResponse.json({ ok: true, url: checkoutSession.url })
  } catch (err) {
    console.error("[billing/create-checkout-session] Error:", err)
    return NextResponse.json({ ok: false, message: "Failed to create checkout session" }, { status: 500 })
  }
}
