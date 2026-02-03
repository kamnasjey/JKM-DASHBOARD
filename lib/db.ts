/**
 * DEPRECATED AND REMOVED
 *
 * Prisma has been fully replaced with Firestore.
 * All authentication, user data, and billing now use Firestore.
 *
 * This file exists only to prevent import errors from legacy code.
 * All functions return null/false to indicate Prisma is not available.
 */

export function prismaAvailable(): boolean {
  return false
}

export function getPrisma(): null {
  return null
}

export function getPrismaInitError(): Error {
  return new Error("Prisma has been removed. All data is now in Firestore.")
}

export function isPrismaAvailable(): boolean {
  return false
}

export const prisma = null
