/**
 * Dashboard Version Utilities
 * 
 * Provides version/build information for UI display and diagnostics.
 */

/**
 * Get the dashboard build version from environment variables.
 * Uses Vercel's git commit SHA if available, otherwise falls back to "dev".
 * 
 * @returns Short git commit SHA (7 chars) or "dev"
 */
export function getDashboardVersion(): string {
  // Vercel provides full SHA at build time
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  if (sha && sha.length >= 7) {
    return sha.slice(0, 7)
  }
  
  // Fallback for local development
  return "dev"
}

/**
 * Get full version info object for diagnostics
 */
export function getDashboardVersionInfo(): {
  version: string
  env: string
  timestamp: string
} {
  return {
    version: getDashboardVersion(),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  }
}

/**
 * Format version for display (e.g., "v1.2.3-abc1234" or "dev")
 */
export function formatVersionDisplay(): string {
  const version = getDashboardVersion()
  if (version === "dev") {
    return "dev"
  }
  return `git:${version}`
}
