import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { DrawingDoc, CreateDrawingInput, UpdateDrawingInput } from "@/lib/schemas/drawing"

/**
 * Chart Drawings Firestore Store
 *
 * Data model: users/{uid}/drawings/{drawingId}
 *
 * Uses Firebase Admin SDK (server-side only).
 */

const USERS_COLLECTION = "users"
const DRAWINGS_SUBCOLLECTION = "drawings"

/** Maximum drawings per user (across all symbols) */
export const MAX_DRAWINGS_PER_USER = 500

/** Maximum drawings per symbol/timeframe */
export const MAX_DRAWINGS_PER_CHART = 50

/** Default pagination limit */
export const DEFAULT_LIMIT = 100

/**
 * Get drawings collection reference for a user
 */
function getDrawingsRef(userId: string) {
  const db = getFirebaseAdminDb()
  return db.collection(USERS_COLLECTION).doc(userId).collection(DRAWINGS_SUBCOLLECTION)
}

/**
 * List drawings for a user filtered by symbol and timeframe
 */
export async function listDrawings(
  userId: string,
  options: { symbol: string; timeframe: string; limit?: number }
): Promise<DrawingDoc[]> {
  const limit = Math.min(options.limit || DEFAULT_LIMIT, 200)
  const ref = getDrawingsRef(userId)

  const query = ref
    .where("symbol", "==", options.symbol)
    .where("timeframe", "==", options.timeframe)
    .orderBy("createdAt", "desc")
    .limit(limit)

  const snapshot = await query.get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...normalizeDrawing(doc.data()),
  })) as DrawingDoc[]
}

/**
 * Get a single drawing by ID
 */
export async function getDrawing(
  userId: string,
  drawingId: string
): Promise<DrawingDoc | null> {
  const ref = getDrawingsRef(userId).doc(drawingId)
  const doc = await ref.get()

  if (!doc.exists) return null

  return {
    id: doc.id,
    ...normalizeDrawing(doc.data()),
  } as DrawingDoc
}

/**
 * Create a new drawing
 */
export async function createDrawing(
  userId: string,
  input: CreateDrawingInput
): Promise<DrawingDoc> {
  const ref = getDrawingsRef(userId)

  // Check total drawings limit
  const totalCountSnap = await ref.count().get()
  if (totalCountSnap.data().count >= MAX_DRAWINGS_PER_USER) {
    throw new Error(`Maximum ${MAX_DRAWINGS_PER_USER} drawings allowed per user`)
  }

  // Check per-chart limit
  const chartCountSnap = await ref
    .where("symbol", "==", input.symbol)
    .where("timeframe", "==", input.timeframe)
    .count()
    .get()

  if (chartCountSnap.data().count >= MAX_DRAWINGS_PER_CHART) {
    throw new Error(`Maximum ${MAX_DRAWINGS_PER_CHART} drawings per chart`)
  }

  // Generate ID
  const newRef = ref.doc()
  const now = FieldValue.serverTimestamp()

  const data = stripUndefinedDeep({
    symbol: input.symbol,
    timeframe: input.timeframe,
    tool: input.tool,
    color: input.color,
    lineWidth: input.lineWidth,
    lineStyle: input.lineStyle,
    label: input.label || null,
    visible: input.visible ?? true,
    locked: input.locked ?? false,
    // Tool-specific fields
    price: (input as any).price,
    startTime: (input as any).startTime,
    startPrice: (input as any).startPrice,
    endTime: (input as any).endTime,
    endPrice: (input as any).endPrice,
    levels: (input as any).levels,
    fillColor: (input as any).fillColor,
    createdAt: now,
    updatedAt: now,
  })

  await newRef.set(data)

  // Fetch back to get actual timestamps
  const created = await newRef.get()
  return {
    id: newRef.id,
    ...normalizeDrawing(created.data()),
  } as DrawingDoc
}

/**
 * Update an existing drawing
 */
export async function updateDrawing(
  userId: string,
  drawingId: string,
  input: UpdateDrawingInput
): Promise<DrawingDoc> {
  const ref = getDrawingsRef(userId).doc(drawingId)
  const doc = await ref.get()

  if (!doc.exists) {
    throw new Error("Drawing not found")
  }

  const updateData: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Only update provided fields
  if (input.color !== undefined) updateData.color = input.color
  if (input.lineWidth !== undefined) updateData.lineWidth = input.lineWidth
  if (input.lineStyle !== undefined) updateData.lineStyle = input.lineStyle
  if (input.label !== undefined) updateData.label = input.label
  if (input.visible !== undefined) updateData.visible = input.visible
  if (input.locked !== undefined) updateData.locked = input.locked
  if (input.price !== undefined) updateData.price = input.price
  if (input.startTime !== undefined) updateData.startTime = input.startTime
  if (input.startPrice !== undefined) updateData.startPrice = input.startPrice
  if (input.endTime !== undefined) updateData.endTime = input.endTime
  if (input.endPrice !== undefined) updateData.endPrice = input.endPrice
  if (input.levels !== undefined) updateData.levels = input.levels
  if (input.fillColor !== undefined) updateData.fillColor = input.fillColor

  await ref.update(stripUndefinedDeep(updateData))

  // Fetch back
  const updated = await ref.get()
  return {
    id: ref.id,
    ...normalizeDrawing(updated.data()),
  } as DrawingDoc
}

/**
 * Delete a drawing
 */
export async function deleteDrawing(
  userId: string,
  drawingId: string
): Promise<void> {
  const ref = getDrawingsRef(userId).doc(drawingId)
  const doc = await ref.get()

  if (!doc.exists) {
    throw new Error("Drawing not found")
  }

  await ref.delete()
}

/**
 * Delete all drawings for a symbol/timeframe
 */
export async function clearDrawings(
  userId: string,
  symbol: string,
  timeframe: string
): Promise<number> {
  const ref = getDrawingsRef(userId)
  const snapshot = await ref
    .where("symbol", "==", symbol)
    .where("timeframe", "==", timeframe)
    .get()

  const batch = getFirebaseAdminDb().batch()
  snapshot.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()

  return snapshot.docs.length
}

/**
 * Get count of user's drawings
 */
export async function getDrawingCount(userId: string): Promise<number> {
  const ref = getDrawingsRef(userId)
  const countSnap = await ref.count().get()
  return countSnap.data().count
}

/**
 * Normalize Firestore data to DrawingDoc
 */
function normalizeDrawing(data: any): Omit<DrawingDoc, "id"> {
  return {
    symbol: String(data?.symbol || ""),
    timeframe: String(data?.timeframe || "M5"),
    tool: data?.tool || "horizontal_line",
    color: String(data?.color || "#f59e0b"),
    lineWidth: Number(data?.lineWidth || 1),
    lineStyle: data?.lineStyle || "solid",
    label: data?.label || null,
    visible: Boolean(data?.visible ?? true),
    locked: Boolean(data?.locked ?? false),
    // Tool-specific
    price: data?.price !== undefined ? Number(data.price) : undefined,
    startTime: data?.startTime !== undefined ? Number(data.startTime) : undefined,
    startPrice: data?.startPrice !== undefined ? Number(data.startPrice) : undefined,
    endTime: data?.endTime !== undefined ? Number(data.endTime) : undefined,
    endPrice: data?.endPrice !== undefined ? Number(data.endPrice) : undefined,
    levels: Array.isArray(data?.levels) ? data.levels.map(Number) : undefined,
    fillColor: data?.fillColor || null,
    createdAt: toISOString(data?.createdAt),
    updatedAt: toISOString(data?.updatedAt),
  } as any
}

/**
 * Convert Firestore timestamp to ISO string
 */
function toISOString(ts: any): string {
  if (!ts) return new Date().toISOString()
  if (typeof ts === "string") return ts
  if (ts.toDate && typeof ts.toDate === "function") {
    return ts.toDate().toISOString()
  }
  if (ts instanceof Date) return ts.toISOString()
  return new Date().toISOString()
}
