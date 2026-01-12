import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  if (_stripe) return _stripe

  _stripe = new Stripe(secretKey, {
    // Use Stripe SDK default API version. You can pin this later if desired.
  })
  return _stripe
}
