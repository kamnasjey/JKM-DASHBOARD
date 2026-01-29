/* eslint-disable no-console */
try {
  require("dotenv").config()
} catch {
  // dotenv is optional; rely on process.env if not installed
}

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")

function normalizePrivateKey(privateKey) {
  return String(privateKey || "").replace(/\\n/g, "\n")
}

function loadServiceAccount() {
  const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (json && json.trim().length > 0) {
    const parsed = JSON.parse(json)
    const projectId = String(parsed.project_id || parsed.projectId || "").trim()
    const clientEmail = String(parsed.client_email || parsed.clientEmail || "").trim()
    const privateKeyRaw = String(parsed.private_key || parsed.privateKey || "")

    if (!projectId || !clientEmail || !privateKeyRaw) {
      throw new Error("Service account JSON missing required fields")
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKeyRaw),
    }
  }

  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || "").trim()
  const clientEmail = (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "").trim()
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ""

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Missing Firebase Admin env. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)",
    )
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
  }
}

function getDb() {
  const existing = getApps()
  const app = existing.length
    ? existing[0]
    : initializeApp({
        credential: cert(loadServiceAccount()),
      })

  const dbId = String(process.env.FIRESTORE_DATABASE_ID || "").trim()
  return dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app)
}

function chunk(array, size) {
  const out = []
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size))
  }
  return out
}

async function deleteStrategiesForUser(db, userId) {
  const strategiesRef = db.collection("users").doc(userId).collection("strategies")
  const snapshot = await strategiesRef.get()

  if (snapshot.empty) {
    console.log(`[delete] No strategies found for user ${userId}`)
    return { deleted: 0, starterIds: [] }
  }

  const docs = snapshot.docs
  const starterIds = []

  for (const doc of docs) {
    if (doc.id.startsWith("starter_")) starterIds.push(doc.id)
  }

  let deleted = 0
  for (const batchDocs of chunk(docs, 400)) {
    const batch = db.batch()
    for (const doc of batchDocs) {
      batch.delete(doc.ref)
      deleted += 1
    }
    await batch.commit()
  }

  if (starterIds.length > 0) {
    await db
      .collection("users")
      .doc(userId)
      .set(
        {
          starterDeletedIds: FieldValue.arrayUnion(...starterIds),
        },
        { merge: true },
      )
  }

  await db
    .collection("users")
    .doc(userId)
    .set(
      {
        activeStrategyId: null,
        defaultStrategyId: null,
        activeStrategyMap: {},
        requireExplicitMapping: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )

  return { deleted, starterIds }
}

async function main() {
  const email = String(process.argv[2] || "")
    .trim()
    .toLowerCase()

  if (!email) {
    console.error("Usage: node scripts/delete_user_strategies_by_email.js <email>")
    process.exit(1)
  }

  const db = getDb()
  const usersSnap = await db.collection("users").where("email", "==", email).get()

  if (usersSnap.empty) {
    console.error(`No user found with email: ${email}`)
    process.exit(2)
  }

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const result = await deleteStrategiesForUser(db, userId)
    console.log(
      `[delete] user=${userId} deleted=${result.deleted} starters=${result.starterIds.length}`,
    )
  }
}

main().catch((err) => {
  console.error("Fatal error:", err?.message || err)
  process.exit(1)
})
