"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const data = await api.getLogs()
      setLogs(data)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: error.message,
      })
    }
  }

  const filtered = logs.filter((log) => log.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Logs</h1>
        <p className="text-muted-foreground">Системийн log бичлэгүүд</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Log хайх..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-4">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? "Хайлтын үр дүн олдсонгүй" : "Log байхгүй байна"}
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {filtered.map((log, idx) => (
                <div key={idx} className="flex gap-2 rounded border border-border/50 bg-muted/30 p-2">
                  <Badge variant="outline" className="shrink-0">
                    {idx + 1}
                  </Badge>
                  <pre className="flex-1 overflow-x-auto">{log}</pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
