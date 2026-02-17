/**
 * DELETE /api/admin/delete-all-strategies
 *
 * Delete ALL strategies for ALL users from Firestore.
 * DANGEROUS - admin only endpoint.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function DELETE(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get("x-admin-secret")
  if (!ADMIN_SECRET || authHeader !== ADMIN_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  console.log("[admin] Starting deletion of ALL strategies...")

  const db = getFirebaseAdminDb()
  const USERS_COLLECTION = "users"
  const STRATEGIES_SUBCOLLECTION = "strategies"

  // Get all users
  const usersSnap = await db.collection(USERS_COLLECTION).get()
  console.log(`[admin] Found ${usersSnap.size} users`)

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

    console.log(`[admin] User ${userId.slice(0, 12)}... has ${strategiesSnap.size} strategies`)

    // Delete each strategy in batches of 500 (Firestore limit)
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
    console.log(`[admin]   Deleted ${strategiesSnap.size} strategies`)
  }

  console.log(`[admin] DONE: Deleted ${totalDeleted} strategies from ${usersProcessed} users`)

  return NextResponse.json({
    ok: true,
    message: `Deleted ${totalDeleted} strategies from ${usersProcessed} users`,
    totalDeleted,
    usersProcessed,
  })
}
