import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp } from "lucide-react"
import type { SignalPayloadPublicV1, Annotations } from "@/lib/types"
import { calculateConfidence } from "@/lib/utils-trading"

interface ExplainPanelProps {
  signal?: SignalPayloadPublicV1 | null
  annotations?: Annotations | null
}

export function ExplainPanel({ signal, annotations }: ExplainPanelProps) {
  const confidence = signal ? calculateConfidence(signal) : 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Яагаад энэ дохио гарсан бэ?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confidence Meter */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Confidence</span>
            <Badge variant={confidence >= 75 ? "default" : confidence >= 50 ? "secondary" : "destructive"}>
              {confidence}%
            </Badge>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${confidence >= 75 ? "bg-green-500" : confidence >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Reasons */}
        {annotations?.reasons && annotations.reasons.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Шалтгаан:</h4>
            <ul className="space-y-2">
              {annotations.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Analysis */}
        {signal && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" />
              Risk & Plan
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                RR: <span className="font-medium text-foreground">{signal.rr?.toFixed(2) || "N/A"}</span>
              </p>
              <p>
                Entry: <span className="font-medium text-foreground">{signal.entry?.toFixed(5) || "N/A"}</span>
              </p>
              <p>
                Stop Loss: <span className="font-medium text-foreground">{signal.sl?.toFixed(5) || "N/A"}</span>
              </p>
              <p>
                Take Profit: <span className="font-medium text-foreground">{signal.tp?.toFixed(5) || "N/A"}</span>
              </p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="space-y-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Checklist өмнө entry:</p>
          <ul className="space-y-1 text-xs">
            <li>✓ RR нь таны шаардлага хангаж байна уу?</li>
            <li>✓ Risk per trade дүрэм дагаж байна уу?</li>
            <li>✓ Зах зээлийн чиг хандлага таарч байна уу?</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
