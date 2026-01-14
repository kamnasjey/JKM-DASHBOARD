"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Dynamic runtime config check - prevents build-time Firebase init
export const dynamic = 'force-dynamic'

type EnvKey =
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID"
  | "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"

const ENV_KEYS: EnvKey[] = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
]

function mask(value: string | undefined) {
  if (!value) return "(missing)"
  if (value.length <= 10) return "***"
  return value.slice(0, 4) + "…" + value.slice(-4)
}

export default function DebugFirebasePage() {
  const [firebaseStatus, setFirebaseStatus] = useState<{
    appName?: string
    projectId?: string
    authOk?: boolean
    dbOk?: boolean
    error?: string
  } | null>(null)

  const [envStatus, setEnvStatus] = useState<Array<{
    key: string
    present: boolean
    preview: string
  }>>([])

  useEffect(() => {
    // Check env vars (client-side only)
    const envCheck = ENV_KEYS.map((key) => {
      const value = process.env[key]
      return {
        key,
        present: Boolean(value && String(value).trim().length > 0),
        preview: key === "NEXT_PUBLIC_FIREBASE_API_KEY" ? mask(value) : value || "(missing)",
      }
    })
    setEnvStatus(envCheck)

    // Dynamically import firebase to avoid build-time init
    import("@/lib/firebase")
      .then(({ default: app, auth, db }) => {
        setFirebaseStatus({
          appName: app.name,
          projectId: (app.options as Record<string, unknown>)?.projectId as string || "(missing)",
          authOk: Boolean(auth),
          dbOk: Boolean(db),
        })
      })
      .catch((err) => {
        setFirebaseStatus({ error: err.message })
      })
  }, [])

  if (!firebaseStatus) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">Loading Firebase status...</CardContent>
        </Card>
      </div>
    )
  }

  if (firebaseStatus.error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-destructive">{firebaseStatus.error}</pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Debug</CardTitle>
          <CardDescription>
            Firebase client SDK ийн init OK эсэхийг шалгана. Энэ нь зөвхөн client талын config шалгалт.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="App name" value={firebaseStatus.appName || "(missing)"} />
            <Info label="Project ID" value={firebaseStatus.projectId || "(missing)"} />
            <Info label="Auth" value={firebaseStatus.authOk ? "initialized" : "missing"} />
            <Info label="Firestore" value={firebaseStatus.dbOk ? "initialized" : "missing"} />
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Env vars (NEXT_PUBLIC_*)</div>
            <div className="space-y-1">
              {envStatus.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <div className="font-mono text-xs break-all">{row.key}</div>
                  <div className={row.present ? "text-emerald-700" : "text-destructive"}>
                    {row.present ? "OK" : "MISSING"}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground break-all">{row.preview}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Vercel дээр deploy хийх бол эдгээр утгуудыг Project → Settings → Environment Variables дээр мөн тохируулна.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm break-all">{value}</div>
    </div>
  )
}
