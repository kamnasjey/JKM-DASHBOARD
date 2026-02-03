/**
 * Remove strategies field from user prefs
 * This field should not be in prefs - strategies are in the strategies collection
 *
 * Run: npx tsx scripts/remove-prefs-strategies.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { getFirebaseAdminDb } from "../lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const TARGET_USER_ID = "cmkaspmrp0000klwig8orkd7l"

async function removePrefsStrategies() {
  console.log("=== Remove strategies from user prefs ===\n")
  console.log(`Target User ID: ${TARGET_USER_ID}`)

  const db = getFirebaseAdminDb()
  const userRef = db.collection("users").doc(TARGET_USER_ID)

  // Get current prefs
  const doc = await userRef.get()
  if (!doc.exists) {
    console.log("User doc not found!")
    return
  }

  const data = doc.data()
  console.log("\nCurrent prefs.strategies:", JSON.stringify(data?.strategies, null, 2))

  // Remove strategies field using FieldValue.delete()
  await userRef.update({
    strategies: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  })

  console.log("\n✅ Removed strategies field from user prefs")

  // Verify
  const updatedDoc = await userRef.get()
  const updatedData = updatedDoc.data()
  console.log("\nUpdated prefs.strategies:", updatedData?.strategies === undefined ? "DELETED" : JSON.stringify(updatedData?.strategies))
}

removePrefsStrategies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
