/**
 * Internal storage for user data
 * Supports Firestore (preferred) with local JSON fallback
 */

import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as fs from "fs"
import * as path from "path"

// Initialize Firebase Admin if not already done
function getFirestoreDb() {
  try {
    if (getApps().length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      if (serviceAccount) {
        initializeApp({
          credential: cert(JSON.parse(serviceAccount)),
        })
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp()
      } else {
        return null
      }
    }
    return getFirestore()
  } catch (error) {
    console.error("[internal-storage] Firestore init error:", error)
    return null
  }
}

// Local JSON fallback storage
const DATA_DIR = path.join(process.cwd(), ".data", "userData")

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getUserDataPath(uid: string, docType: string): string {
  const userDir = path.join(DATA_DIR, uid)
  ensureDir(userDir)
  return path.join(userDir, `${docType}.json`)
}

// =====================================================
// Strategies Storage
// =====================================================

export interface UserStrategiesDoc {
  strategies: Array<{
    id: string
    name: string
    [key: string]: unknown
  }>
  updatedAt: number
}

export async function getStrategies(uid: string): Promise<UserStrategiesDoc> {
  const db = getFirestoreDb()
  
  if (db) {
    try {
      const doc = await db.collection("userData").doc(uid).collection("docs").doc("strategies").get()
      if (doc.exists) {
        const data = doc.data() as UserStrategiesDoc
        return {
          strategies: data.strategies || [],
          updatedAt: data.updatedAt || 0,
        }
      }
    } catch (error) {
      console.error("[internal-storage] Firestore get strategies error:", error)
    }
  }
  
  // Fallback to local JSON
  const filePath = getUserDataPath(uid, "strategies")
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      return {
        strategies: data.strategies || [],
        updatedAt: data.updatedAt || 0,
      }
    } catch (error) {
      console.error("[internal-storage] Local read error:", error)
    }
  }
  
  return { strategies: [], updatedAt: 0 }
}

export async function saveStrategies(uid: string, strategies: unknown[]): Promise<boolean> {
  const doc: UserStrategiesDoc = {
    strategies: strategies as UserStrategiesDoc["strategies"],
    updatedAt: Date.now(),
  }
  
  const db = getFirestoreDb()
  
  if (db) {
    try {
      await db.collection("userData").doc(uid).collection("docs").doc("strategies").set(doc)
      return true
    } catch (error) {
      console.error("[internal-storage] Firestore save strategies error:", error)
    }
  }
  
  // Fallback to local JSON
  try {
    const filePath = getUserDataPath(uid, "strategies")
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), "utf-8")
    return true
  } catch (error) {
    console.error("[internal-storage] Local write error:", error)
    return false
  }
}

// =====================================================
// Active Strategy Storage
// =====================================================

export interface ActiveStrategyDoc {
  activeStrategyId: string | null
  updatedAt: number
}

export async function getActiveStrategy(uid: string): Promise<ActiveStrategyDoc> {
  const db = getFirestoreDb()
  
  if (db) {
    try {
      const doc = await db.collection("userData").doc(uid).collection("docs").doc("activeStrategy").get()
      if (doc.exists) {
        const data = doc.data() as ActiveStrategyDoc
        return {
          activeStrategyId: data.activeStrategyId || null,
          updatedAt: data.updatedAt || 0,
        }
      }
    } catch (error) {
      console.error("[internal-storage] Firestore get activeStrategy error:", error)
    }
  }
  
  // Fallback to local JSON
  const filePath = getUserDataPath(uid, "activeStrategy")
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      return {
        activeStrategyId: data.activeStrategyId || null,
        updatedAt: data.updatedAt || 0,
      }
    } catch (error) {
      console.error("[internal-storage] Local read error:", error)
    }
  }
  
  return { activeStrategyId: null, updatedAt: 0 }
}

export async function saveActiveStrategy(uid: string, activeStrategyId: string | null): Promise<boolean> {
  const doc: ActiveStrategyDoc = {
    activeStrategyId,
    updatedAt: Date.now(),
  }
  
  const db = getFirestoreDb()
  
  if (db) {
    try {
      await db.collection("userData").doc(uid).collection("docs").doc("activeStrategy").set(doc)
      return true
    } catch (error) {
      console.error("[internal-storage] Firestore save activeStrategy error:", error)
    }
  }
  
  // Fallback to local JSON
  try {
    const filePath = getUserDataPath(uid, "activeStrategy")
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), "utf-8")
    return true
  } catch (error) {
    console.error("[internal-storage] Local write error:", error)
    return false
  }
}

// =====================================================
// Strategy Map Storage (symbol -> strategyId)
// =====================================================

export interface StrategyMapDoc {
  map: Record<string, string>
  default?: string
  updatedAt: number
}

export async function getStrategyMap(uid: string): Promise<StrategyMapDoc> {
  const db = getFirestoreDb()
  
  if (db) {
    try {
      const doc = await db.collection("userData").doc(uid).collection("docs").doc("strategyMap").get()
      if (doc.exists) {
        const data = doc.data() as StrategyMapDoc
        return {
          map: data.map || {},
          default: data.default,
          updatedAt: data.updatedAt || 0,
        }
      }
    } catch (error) {
      console.error("[internal-storage] Firestore get strategyMap error:", error)
    }
  }
  
  // Fallback to local JSON
  const filePath = getUserDataPath(uid, "strategyMap")
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      return {
        map: data.map || {},
        default: data.default,
        updatedAt: data.updatedAt || 0,
      }
    } catch (error) {
      console.error("[internal-storage] Local read error:", error)
    }
  }
  
  return { map: {}, updatedAt: 0 }
}

export async function saveStrategyMap(uid: string, map: Record<string, string>, defaultId?: string): Promise<boolean> {
  const doc: StrategyMapDoc = {
    map,
    default: defaultId,
    updatedAt: Date.now(),
  }
  
  const db = getFirestoreDb()
  
  if (db) {
    try {
      await db.collection("userData").doc(uid).collection("docs").doc("strategyMap").set(doc)
      return true
    } catch (error) {
      console.error("[internal-storage] Firestore save strategyMap error:", error)
    }
  }
  
  // Fallback to local JSON
  try {
    const filePath = getUserDataPath(uid, "strategyMap")
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), "utf-8")
    return true
  } catch (error) {
    console.error("[internal-storage] Local write error:", error)
    return false
  }
}
