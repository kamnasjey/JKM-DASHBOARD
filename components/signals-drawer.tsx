"use client"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface SignalsDrawerProps {
  signal: any
  onClose: () => void
}

export function SignalsDrawer({ signal, onClose }: SignalsDrawerProps) {
  if (!signal) return null

  return (
    <Sheet open={!!signal} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{signal.symbol} Setup Detail</SheetTitle>
          <SheetDescription>
            {signal.direction} · {signal.status}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Үндсэн мэдээлэл</div>
            <div className="rounded-md border p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Цаг:</span>
                <span>{new Date(signal.timestamp).toLocaleString("mn-MN")}</span>

                <span className="text-muted-foreground">Entry:</span>
                <span className="font-mono">{signal.entry_price}</span>

                <span className="text-muted-foreground">SL:</span>
                <span className="font-mono">{signal.stop_loss}</span>

                <span className="text-muted-foreground">TP:</span>
                <span className="font-mono">{signal.take_profit}</span>
              </div>
            </div>
          </div>

          {/* Evidence Summary */}
          {signal.evidence && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Тайлбар</div>
              {/* Human-readable summary */}
              {(signal.evidence.summary || signal.evidence.reason) && (
                <div className="rounded-md border bg-primary/5 border-primary/20 p-3">
                  <p className="text-sm leading-relaxed">
                    {signal.evidence.summary || signal.evidence.reason}
                  </p>
                </div>
              )}
              {/* Detailed breakdown (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Дэлгэрэнгүй харах...
                </summary>
                <div className="mt-2 rounded-md border bg-muted/30 p-3">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(signal.evidence, null, 2)}</pre>
                </div>
              </details>
            </div>
          )}

          {/* Fail Reason */}
          {signal.fail_reason && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-red-500">Fail Reason</div>
              <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
                {signal.fail_reason}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
