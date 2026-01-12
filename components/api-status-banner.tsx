"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ApiStatusBannerProps {
  onRetry?: () => void
}

export function ApiStatusBanner({ onRetry }: ApiStatusBannerProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>API холбогдох боломжгүй байна</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>API call амжилтгүй боллоо. Дараах зүйлсийг шалгаарай:</p>
        <ul className="ml-4 list-disc space-y-1 text-sm">
          <li>Backend ажиллаж байгаа эсэх (proxy нь backend рүү forward хийдэг)</li>
          <li>`BACKEND_INTERNAL_API_KEY` тохируулагдсан эсэх</li>
          <li>Төлбөр шаардлагатай (payment gating) байж болох</li>
        </ul>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 bg-transparent">
            <RefreshCw className="mr-2 h-4 w-4" />
            Дахин оролдох
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
