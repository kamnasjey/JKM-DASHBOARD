"use client"

import { useState } from "react"
import { Sparkles, Loader2, X, MessageCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AIExplainDialogProps {
  signalId: string
  symbol: string
  direction: string
  trigger?: React.ReactNode
}

export function AIExplainDialog({
  signalId,
  symbol,
  direction,
  trigger,
}: AIExplainDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explainType, setExplainType] = useState<"ai" | "basic" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadExplanation = async () => {
    if (explanation) return // Already loaded

    setLoading(true)
    setError(null)

    try {
      const result = await api.explainSignal(signalId)
      if (result.ok) {
        setExplanation(result.explanation)
        setExplainType(result.explain_type)
      } else {
        throw new Error("Failed to get explanation")
      }
    } catch (err: any) {
      console.error("Failed to get explanation:", err)
      setError(err.message || "Тайлбар авахад алдаа гарлаа")
      toast({
        title: "Алдаа",
        description: "AI тайлбар авахад алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      loadExplanation()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI тайлбар</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI тайлбар
            <Badge
              variant={direction === "BUY" ? "default" : "destructive"}
              className="ml-2"
            >
              {symbol} - {direction}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            OpenAI-ийн тусламжтай энэ setup-ийн тайлбар
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                AI тайлбар үүсгэж байна...
              </p>
            </div>
          )}

          {error && !loading && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-destructive">
                  <X className="h-5 w-5" />
                  <p>{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={loadExplanation}
                >
                  Дахин оролдох
                </Button>
              </CardContent>
            </Card>
          )}

          {explanation && !loading && (
            <div className="space-y-4">
              {explainType && (
                <Badge variant={explainType === "ai" ? "default" : "secondary"}>
                  {explainType === "ai" ? "🤖 AI тайлбар" : "📋 Үндсэн тайлбар"}
                </Badge>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-sans leading-relaxed">
                      {explanation}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                <span>
                  Энэ тайлбар нь зөвхөн мэдээлэл өгөх зорилготой бөгөөд санхүүгийн
                  зөвлөгөө биш.
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
