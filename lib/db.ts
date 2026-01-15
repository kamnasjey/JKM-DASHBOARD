import { PrismaClient } from "@prisma/client"

declare global {
  var prisma: PrismaClient | undefined
  var prismaInitError: Error | undefined
}

/**
 * Lazy Prisma initialization.
 * If DATABASE_URL is missing, prisma will be null and prismaInitError will be set.
 * This allows the app to run in "Firestore-only" mode without crashing.
 */
function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    globalThis.prismaInitError = new Error("DATABASE_URL not set - Prisma disabled")
    return null
  }
  try {
    return new PrismaClient()
  } catch (err) {
    globalThis.prismaInitError = err instanceof Error ? err : new Error(String(err))
    return null
  }
}

export const prisma: PrismaClient | null = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production" && prisma) {
  globalThis.prisma = prisma
}

/**
 * Check if Prisma is available and connected.
 * Use this before any Prisma operations in routes that should gracefully degrade.
 */
export function isPrismaAvailable(): boolean {
  return prisma !== null
}

/**
 * Get the Prisma initialization error, if any.
 */
export function getPrismaInitError(): Error | undefined {
  return globalThis.prismaInitError
}
