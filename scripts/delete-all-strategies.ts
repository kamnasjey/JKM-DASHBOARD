/**
 * Delete ALL strategies for ALL users from Firestore
 *
 * Run with: npx ts-node scripts/delete-all-strategies.ts
 */

import { getFirebaseAdminDb } from "../lib/firebase-admin"

const USERS_COLLECTION = "users"
const STRATEGIES_SUBCOLLECTION = "strategies"

async function deleteAllStrategies() {
  console.log("Starting strategy deletion...")

  const db = getFirebaseAdminDb()

  // Get all users
  const usersSnap = await db.collection(USERS_COLLECTION).get()
  console.log(`Found ${usersSnap.size} users`)

  let totalDeleted = 0
  let usersProcessed = 0

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const strategiesRef = db.collection(USERS_COLLECTION).doc(userId).collection(STRATEGIES_SUBCOLLECTION)

    // Get all strategies for this user
    const strategiesSnap = await strategiesRef.get()

    if (strategiesSnap.empty) {
      usersProcessed++
      continue
    }

    console.log(`User ${userId.slice(0, 12)}... has ${strategiesSnap.size} strategies`)

    // Delete each strategy
    const batch = db.batch()
    for (const stratDoc of strategiesSnap.docs) {
      batch.delete(stratDoc.ref)
      totalDeleted++
    }

    // Also clear starter seeded flag and mark all starters as deleted
    batch.update(userDoc.ref, {
      starterSeeded: false,
      starterSeedVersion: null,
      starterDeletedIds: ["starter_EDGE_1", "starter_EDGE_2", "starter_EDGE_3"],
    })

    await batch.commit()
    usersProcessed++
    console.log(`  Deleted ${strategiesSnap.size} strategies`)
  }

  console.log(`\nDONE: Deleted ${totalDeleted} strategies from ${usersProcessed} users`)
}

deleteAllStrategies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
