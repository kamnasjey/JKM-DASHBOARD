"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowDownRight, Eye, Sparkles } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AIExplainDialog } from "@/components/ai-explain-dialog"
import { formatTimestamp } from "@/lib/utils-trading"
import type { SignalPayloadPublicV1 } from "@/lib/types"

interface SignalsTableProps {
  signals: SignalPayloadPublicV1[]
  limit?: number
}

export function SignalsTable({ signals, limit }: SignalsTableProps) {
  // Default to timeline on mobile, table on desktop
  const [view, setView] = useState<"table" | "timeline">("timeline")
  const displaySignals = limit ? signals.slice(0, limit) : signals

  useEffect(() => {
    // Switch default based on screen size
    const checkSize = () => {
      setView(window.innerWidth >= 768 ? "table" : "timeline")
    }
    checkSize()
    // Only run once on mount
  }, [])

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
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
      <CardContent className="px-2 sm:px-6">
        {view === "table" ? (
          <div className="-mx-2 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Цаг</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="hidden sm:table-cell">TF</TableHead>
                  <TableHead>Чиглэл</TableHead>
                  <TableHead className="hidden md:table-cell">Entry</TableHead>
                  <TableHead className="hidden md:table-cell">SL</TableHead>
                  <TableHead className="hidden md:table-cell">TP</TableHead>
                  <TableHead className="hidden sm:table-cell">RR</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displaySignals.map((signal) => (
                  <TableRow key={signal.signal_id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatTimestamp(signal.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{signal.symbol}</TableCell>
                    <TableCell className="hidden sm:table-cell">
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
                        <span className="hidden xs:inline">{signal.direction}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{signal.entry?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell">{signal.sl?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell">{signal.tp?.toFixed(5) || "N/A"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{signal.rr?.toFixed(2) || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={signal.status === "OK" ? "default" : "secondary"}>{signal.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AIExplainDialog 
                          signalId={signal.signal_id} 
                          symbol={signal.symbol}
                          direction={signal.direction}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Sparkles className="h-4 w-4 text-yellow-500" />
                            </Button>
                          }
                        />
                        <Link href={`/signals/${signal.signal_id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {displaySignals.map((signal) => (
              <div
                key={signal.signal_id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 sm:p-4 transition-colors hover:bg-accent"
              >
                <Link
                  href={`/signals/${signal.signal_id}`}
                  className="flex flex-1 items-center gap-3 sm:gap-4"
                >
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full ${
                      signal.direction === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {signal.direction === "BUY" ? (
                      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">
                      {signal.symbol} <span className="text-muted-foreground">{signal.direction}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(signal.created_at)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {signal.rr && (
                    <Badge variant="outline" className="hidden xs:inline-flex">
                      RR {signal.rr.toFixed(1)}
                    </Badge>
                  )}
                  <Badge variant={signal.status === "OK" ? "default" : "secondary"}>{signal.status}</Badge>
                  <AIExplainDialog 
                    signalId={signal.signal_id} 
                    symbol={signal.symbol}
                    direction={signal.direction}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      </Button>
                    }
                  />
                  <Link href={`/signals/${signal.signal_id}`}>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
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
