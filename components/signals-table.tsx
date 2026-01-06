"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowDownRight, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/utils-trading"
import type { SignalPayloadPublicV1 } from "@/lib/types"

interface SignalsTableProps {
  signals: SignalPayloadPublicV1[]
  limit?: number
}

export function SignalsTable({ signals, limit }: SignalsTableProps) {
  const [view, setView] = useState<"table" | "timeline">("table")
  const displaySignals = limit ? signals.slice(0, limit) : signals

  if (signals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Сүүлийн дохио</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Энд таны дохио хараахан алга.</p>
            <p className="text-sm text-muted-foreground">Scan асаалттай эсэхийг шалгаарай.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Сүүлийн дохио</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}>
            Table
          </Button>
          <Button variant={view === "timeline" ? "secondary" : "ghost"} size="sm" onClick={() => setView("timeline")}>
            Timeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {view === "table" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Цаг</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>TF</TableHead>
                  <TableHead>Чиглэл</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>RR</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displaySignals.map((signal) => (
                  <TableRow key={signal.signal_id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(signal.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{signal.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{signal.tf}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={signal.direction === "BUY" ? "default" : "destructive"}
                        className="flex w-fit items-center gap-1"
                      >
                        {signal.direction === "BUY" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {signal.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>{signal.entry?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell>{signal.sl?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell>{signal.tp?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell>{signal.rr?.toFixed(2) || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={signal.status === "OK" ? "default" : "secondary"}>{signal.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/signals/${signal.signal_id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-3">
            {displaySignals.map((signal) => (
              <div
                key={signal.signal_id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      signal.direction === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {signal.direction === "BUY" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {signal.symbol} {signal.direction}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(signal.created_at)}</p>
                  </div>
                </div>
                <Link href={`/signals/${signal.signal_id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
        {limit && signals.length > limit && (
          <div className="mt-4 text-center">
            <Link href="/signals">
              <Button variant="outline">Бүгдийг үзэх</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
