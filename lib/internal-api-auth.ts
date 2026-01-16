import { NextRequest } from "next/server"

/**
 * The env var name for internal API key.
 * Use DASHBOARD_INTERNAL_API_KEY on both Vercel and DigitalOcean backend.
 */
const INTERNAL_KEY_ENV = "DASHBOARD_INTERNAL_API_KEY"

/**
 * Check if request has valid internal API key.
 * This is used for service-to-service calls (e.g., backend -> dashboard).
 * 
 * @returns true if key is present and matches, false otherwise
 */
export function isValidInternalKey(request: NextRequest | Request): boolean {
  const expected = process.env[INTERNAL_KEY_ENV]
  if (!expected) {
    console.warn(`[internal-auth] ${INTERNAL_KEY_ENV} not configured`)
    return false
  }

  const headers = request.headers
  const got = headers.get("x-internal-api-key") || headers.get("X-Internal-Api-Key")
  
  const valid = !!got && got === expected
  // Safe log: never print keys, only boolean result
  if (!valid && got) {
    console.warn("[internal-auth] Invalid internal API key provided (key mismatch)")
  }
  
  return valid
}

/**
 * Require valid internal API key for a route.
 * Returns a result object for easy guard usage.
 */
export function requireInternalApiKey(request: NextRequest | Request): { ok: true } | { ok: false; status: number; message: string } {
  const expected = process.env[INTERNAL_KEY_ENV]
  if (!expected) {
    console.error(`[internal-auth] Missing ${INTERNAL_KEY_ENV} env var`)
    return { ok: false, status: 500, message: `Missing ${INTERNAL_KEY_ENV}` }
  }

  const headers = request.headers
  const got = headers.get("x-internal-api-key") || headers.get("X-Internal-Api-Key")
  if (!got) {
    return { ok: false, status: 401, message: "Missing x-internal-api-key header" }
  }

  if (got !== expected) {
    console.warn("[internal-auth] Invalid internal API key (mismatch)")
    return { ok: false, status: 403, message: "Invalid internal API key" }
  }

  return { ok: true }
}
