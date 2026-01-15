import { PrismaClient } from "@prisma/client"

declare global {
  var __prismaClient: PrismaClient | undefined
  var __prismaInitError: Error | undefined
  var __prismaInitAttempted: boolean | undefined
}

/**
 * Check if DATABASE_URL is configured.
 * Use this to decide whether to attempt Prisma operations.
 */
export function prismaAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * Lazy Prisma initialization.
 * Returns PrismaClient if available, null otherwise.
 * Does NOT throw - errors are logged and stored.
 */
export function getPrisma(): PrismaClient | null {
  // If DATABASE_URL is not set, skip initialization entirely
  if (!process.env.DATABASE_URL) {
    if (!globalThis.__prismaInitError) {
      globalThis.__prismaInitError = new Error("DATABASE_URL not set - Prisma disabled")
      console.log("[db] Prisma disabled: DATABASE_URL not configured")
    }
    return null
  }

  // Return existing instance if already initialized
  if (globalThis.__prismaClient) {
    return globalThis.__prismaClient
  }

  // If we already tried and failed, don't retry
  if (globalThis.__prismaInitAttempted && globalThis.__prismaInitError) {
    return null
  }

  // Attempt initialization
  globalThis.__prismaInitAttempted = true
  try {
    const client = new PrismaClient()
    // In development, store globally to prevent hot-reload duplicates
    if (process.env.NODE_ENV !== "production") {
      globalThis.__prismaClient = client
    } else {
      globalThis.__prismaClient = client
    }
    console.log("[db] Prisma client initialized successfully")
    return client
  } catch (err) {
    globalThis.__prismaInitError = err instanceof Error ? err : new Error(String(err))
    console.error("[db] Prisma initialization failed:", globalThis.__prismaInitError.message)
    return null
  }
}

/**
 * Get the Prisma initialization error, if any.
 */
export function getPrismaInitError(): Error | undefined {
  return globalThis.__prismaInitError
}

// Legacy exports for backward compatibility
// DEPRECATED: Use getPrisma() instead of importing prisma directly
export function isPrismaAvailable(): boolean {
  return prismaAvailable() && getPrisma() !== null
}

// For legacy imports - will be null if Prisma unavailable
// DEPRECATED: Prefer getPrisma() with null check
export const prisma = getPrisma()
