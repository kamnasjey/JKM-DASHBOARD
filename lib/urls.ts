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
  // Development guard: warn if someone tries to use absolute URL for internal API
  if (typeof window !== "undefined" && path.startsWith("http") && path.includes("/api/internal/")) {
    console.error(
      "BUG: Internal API calls must use relative URLs, not absolute URLs.",
      "Got:", path,
      "Use internalApi('/api/internal/...') instead."
    )
  }

  // Ensure path starts with /
  return path.startsWith("/") ? path : `/${path}`
}

/**
 * Development guard to catch any code that accidentally uses absolute URLs
 * for internal API endpoints in browser context.
 * 
 * Call this before any fetch to validate the URL.
 */
export function assertRelativeInternalUrl(url: string): void {
  if (typeof window !== "undefined" && url.startsWith("http") && url.includes("/api/internal/")) {
    throw new Error(
      `CRITICAL: Attempted to call internal API with absolute URL: ${url}. ` +
      `Internal APIs must always use relative URLs to ensure requests go to the same origin.`
    )
  }
}
