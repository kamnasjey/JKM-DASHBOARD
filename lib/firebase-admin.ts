import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

type ServiceAccountLike = {
  projectId: string
  clientEmail: string
  privateKey: string
}

function normalizePrivateKey(privateKey: string): string {
  // Vercel env vars often store newlines as \n
  return privateKey.replace(/\\n/g, "\n")
}

function loadServiceAccount(): ServiceAccountLike {
  const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (json && json.trim().length > 0) {
    try {
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
    } catch (err: any) {
      throw new Error(
        `Invalid FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON: ${err?.message || String(err)}`,
      )
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

let cachedApp: App | null = null
let cachedDb: Firestore | null = null

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp

  const existing = getApps()
  if (existing.length > 0) {
    cachedApp = existing[0]
    return cachedApp
  }

  const sa = loadServiceAccount()

  cachedApp = initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    }),
  })

  return cachedApp
}

export function getFirebaseAdminDb(): Firestore {
  if (cachedDb) return cachedDb
  const app = getFirebaseAdminApp()
  
  // Use configurable database ID via env, default to standard Firebase default database
  const dbId = (process.env.FIRESTORE_DATABASE_ID || "").trim()
  
  if (dbId && dbId !== "(default)") {
    console.log(`[firebase-admin] Using named Firestore database: ${dbId}`)
    cachedDb = getFirestore(app, dbId)
  } else {
    console.log(`[firebase-admin] Using default Firestore database`)
    cachedDb = getFirestore(app)
  }
  
  return cachedDb
}
