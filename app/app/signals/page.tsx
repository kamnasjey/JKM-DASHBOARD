"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      const data = await api.getSignals({ limit: 50 })
      setSignals(data)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: error.message,
      })
    }
  }

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString("mn-MN")
  }

  const filtered = signals.filter((s) => s.symbol.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Setup илэрцүүд</h1>
        <p className="text-muted-foreground">Олдсон setup-уудын жагсаалт</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Symbol хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "Хайлтын үр дүн олдсонгүй" : "Одоогоор setup олдоогүй байна"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Setup нэр</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead>RR</TableHead>
                  <TableHead>Цаг</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((signal) => (
                  <TableRow key={signal.signal_id} className="cursor-pointer hover:bg-accent">
                    <TableCell className="font-medium">{signal.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{signal.market || "FX"}</Badge>
                    </TableCell>
                    <TableCell>{signal.setup_name || "Default"}</TableCell>
                    <TableCell>{signal.tf}</TableCell>
                    <TableCell>{signal.rr ? `1:${signal.rr.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(signal.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">FOUND</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
