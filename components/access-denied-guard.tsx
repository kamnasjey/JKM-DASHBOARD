"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { AlertTriangle, LogOut, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function AccessDeniedGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [accessStatus, setAccessStatus] = useState<"loading" | "allowed" | "denied">("loading")
  const [userEmail, setUserEmail] = useState<string>("")

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      setAccessStatus("allowed") // Let auth guard handle redirect
      return
    }

    // Check access
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/access-check")
        const data = await res.json()
        
        if (data.hasAccess) {
          setAccessStatus("allowed")
        } else {
          setAccessStatus("denied")
          setUserEmail(data.email || session?.user?.email || "")
        }
      } catch (err) {
        console.error("Access check failed:", err)
        setAccessStatus("denied")
      }
    }

    checkAccess()
  }, [status, session])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  // Show blocking popup if access denied
  if (accessStatus === "denied") {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Хандах эрхгүй</DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p>
                Таны бүртгэл (<span className="font-medium">{userEmail}</span>) системд хандах эрхгүй байна.
              </p>
              <p className="text-muted-foreground">
                Хандах эрх авахын тулд админтай холбогдоно уу.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@jkm-trading.com">
                <Mail className="mr-2 h-4 w-4" />
                Админтай холбогдох
              </a>
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Гарах
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Loading state
  if (accessStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Хандалт шалгаж байна...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
