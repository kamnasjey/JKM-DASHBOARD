"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface JsonViewerProps {
  data: any
  title?: string
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast({
      title: "Хуулагдлаа",
      description: "JSON өгөгдлийг clipboard-руу хуулагдлаа",
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {title || "JSON Data"}
        </button>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {expanded && (
        <pre className="overflow-x-auto p-3 text-xs">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      )}
    </div>
  )
}
