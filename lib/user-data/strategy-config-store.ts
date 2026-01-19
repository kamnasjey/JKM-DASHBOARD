import { getFirebaseAdminDb, stripUndefinedDeep } from "@/lib/firebase-admin"

const USERS_COLLECTION = "users"

export type StrategyConfigDoc = {
  activeStrategyId?: string | null
  activeStrategyMap?: Record<string, string>
  updatedAt?: string
}

export async function getStrategyConfig(userId: string): Promise<StrategyConfigDoc> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)
  const snap = await ref.get()

  if (!snap.exists) {
    return { activeStrategyId: null, activeStrategyMap: {}, updatedAt: undefined }
  }

  const data = snap.data() as Record<string, unknown>
  return {
    activeStrategyId: (data.activeStrategyId as string | null | undefined) ?? (data.defaultStrategyId as string | null | undefined) ?? null,
    activeStrategyMap: (data.activeStrategyMap as Record<string, string> | undefined) ?? {},
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  }
}

export async function setActiveStrategyId(userId: string, activeStrategyId: string | null): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)

  await ref.set(
    stripUndefinedDeep({
      user_id: userId,
      activeStrategyId: activeStrategyId ?? null,
      defaultStrategyId: activeStrategyId ?? null,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  )
}

export async function setStrategyMap(
  userId: string,
  map: Record<string, string>,
  defaultId?: string | null,
): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(USERS_COLLECTION).doc(userId)

  await ref.set(
    stripUndefinedDeep({
      user_id: userId,
      activeStrategyMap: map,
      defaultStrategyId: defaultId ?? undefined,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  )
}
