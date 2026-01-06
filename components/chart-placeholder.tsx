import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface ChartPlaceholderProps {
  symbol: string
}

export function ChartPlaceholder({ symbol }: ChartPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {symbol} Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">Chart visualization placeholder</p>
        </div>
      </CardContent>
    </Card>
  )
}
