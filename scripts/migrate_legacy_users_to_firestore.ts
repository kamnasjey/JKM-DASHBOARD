#!/usr/bin/env npx tsx
/**
 * migrate_legacy_users_to_firestore.ts
 * 
 * Migration script to sync Prisma users to Firestore.
 * This ensures Firestore has all user identity data from Prisma.
 * 
 * Usage:
 *   npx tsx scripts/migrate_legacy_users_to_firestore.ts [--dry-run]
 * 
 * Options:
 *   --dry-run    Preview changes without writing to Firestore
 *   --all        Include all users, not just paid users
 * 
 * Prerequisites:
 *   - DATABASE_URL set (Prisma connection)
 *   - Firebase Admin credentials set (see .env.example)
 */

import { PrismaClient } from "@prisma/client"

// Load env from .env.local
import { config } from "dotenv"
config({ path: ".env.local" })

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const includeAll = args.includes("--all")
  
  console.log("=== Prisma → Firestore User Migration ===")
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`)
  console.log(`Users: ${includeAll ? "ALL" : "Paid only (hasPaidAccess=true)"}`)
  console.log("")

  // Import Firebase Admin dynamically to avoid issues if not configured
  let db: FirebaseFirestore.Firestore
  try {
    const { getFirebaseAdminDb } = await import("../lib/firebase-admin")
    db = getFirebaseAdminDb()
    console.log("✓ Firebase Admin initialized")
  } catch (err) {
    console.error("✗ Failed to initialize Firebase Admin:", err)
    console.error("  Make sure FIREBASE_ADMIN_* env vars are set correctly.")
    process.exit(1)
  }

  // Fetch users from Prisma
  const whereClause = includeAll ? {} : { hasPaidAccess: true }
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      hasPaidAccess: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  console.log(`Found ${users.length} users in Prisma`)
  console.log("")

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    const userId = user.id
    const identity = {
      user_id: userId,
      email: user.email,
      name: user.name,
      has_paid_access: user.hasPaidAccess,
      // Add timestamps from Prisma
      prisma_created_at: user.createdAt?.toISOString() || null,
      prisma_updated_at: user.updatedAt?.toISOString() || null,
      updatedAt: new Date().toISOString(),
    }

    console.log(`Processing: ${userId} (${user.email || "no email"})`)

    if (dryRun) {
      console.log(`  [DRY RUN] Would upsert:`, JSON.stringify(identity, null, 2))
      synced++
      continue
    }

    try {
      const ref = db.collection("users").doc(userId)
      const snap = await ref.get()

      if (!snap.exists) {
        // New user in Firestore
        await ref.set({
          ...identity,
          createdAt: new Date().toISOString(),
        })
        console.log(`  ✓ Created new Firestore doc`)
      } else {
        // Merge with existing
        await ref.set(identity, { merge: true })
        console.log(`  ✓ Merged with existing Firestore doc`)
      }

      synced++
    } catch (err) {
      console.error(`  ✗ Error syncing user ${userId}:`, err)
      errors++
    }
  }

  console.log("")
  console.log("=== Migration Summary ===")
  console.log(`Total users: ${users.length}`)
  console.log(`Synced: ${synced}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  
  if (dryRun) {
    console.log("")
    console.log("This was a DRY RUN. Run without --dry-run to apply changes.")
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
