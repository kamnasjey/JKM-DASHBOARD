/**
 * URL Helpers for internal API calls
 * 
 * IMPORTANT: All browser-side calls to /api/internal/* MUST use relative URLs.
 * Never construct absolute URLs using NEXT_PUBLIC_* env vars for internal endpoints.
 */

/**
 * Returns a relative URL for internal API endpoints.
 * Ensures path starts with "/" for proper routing.
 * 
 * @example
 * internalApi("/api/internal/user-data/strategies/123")
 * // Returns: "/api/internal/user-data/strategies/123"
 */
export function internalApi(path: string): string {
  const normalized = normalizeLocalApiPath(path)

  // Development guard: internalApi is only for /api/internal/*
  if (typeof window !== "undefined" && !normalized.startsWith("/api/internal/")) {
    console.error(
      "BUG: internalApi() must be used with '/api/internal/*' paths only.",
      "Got:",
      path,
      "Normalized:",
      normalized
    )
  }

  return normalized
}

/**
 * Development guard to catch any code that accidentally uses absolute URLs
 * for internal API endpoints in browser context.
 * 
 * Call this before any fetch to validate the URL.
 */
export function assertRelativeInternalUrl(url: string): void {
  // We keep this function name for compatibility, but we now normalize instead of throwing.
  // This makes production more resilient if a wrong domain is accidentally introduced via ENV.
  // Callers that need the normalized URL should use normalizeLocalApiPath().
  normalizeLocalApiPath(url)
}

/**
 * Normalizes dashboard API paths to same-origin relative URLs.
 *
 * If someone accidentally passes an absolute URL like:
 *   https://something.vercel.app/api/internal/user-data/...
 * this returns:
 *   /api/internal/user-data/...
 *
 * This is intentionally strict: it only accepts /api/* paths.
 */
export function normalizeLocalApiPath(input: string): string {
  const raw = (input ?? "").trim()

  if (!raw) return "/"

  // If absolute URL, strip origin and keep only /api/* path.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw)
      const path = `${parsed.pathname}${parsed.search}`
      
      // Log warning in dev/browser if someone tried to use absolute URL
      if (typeof window !== "undefined") {
        console.warn(
          `[JKM URL Guard] Stripped absolute URL to relative path.`,
          `Original: ${raw.substring(0, 80)}...`,
          `Result: ${path}`
        )
      }
      
      if (!path.startsWith("/api/")) {
        throw new Error(
          `Expected a local '/api/*' URL but got '${raw}'. If you meant to call an external API, do not use apiFetch().`
        )
      }
      return path
    } catch (e) {
      // If parsing fails, fall through to relative handling.
      // (We still enforce leading slash below.)
    }
  }

  // Ensure leading slash.
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`

  // apiFetch is meant for local /api/* only.
  if (!withSlash.startsWith("/api/")) {
    throw new Error(
      `Expected a local '/api/*' path but got '${input}'. If you meant to call an external API, do not use apiFetch().`
    )
  }

  return withSlash
}
