import { Card } from "@/components/ui/card"
import { BarChart3, TrendingUp, Activity } from "lucide-react"

export function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Dashboard Preview</h2>
        <p className="text-lg text-muted-foreground">Нэвтэрсний дараа бодит дата харагдана.</p>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/50 backdrop-blur p-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Chart */}
          <div className="lg:col-span-8">
            <div className="aspect-video rounded-xl border border-border/50 bg-background/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium">EURUSD • 1H</div>
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div className="text-xs text-muted-foreground">Live</div>
                </div>
              </div>
              <div className="relative h-full">
                {/* Mock candlestick chart */}
                <div className="absolute inset-0 flex items-end justify-around gap-1 px-4 pb-8">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const height = Math.random() * 60 + 20
                    const isGreen = Math.random() > 0.5
                    return (
                      <div
                        key={i}
                        className="w-full"
                        style={{
                          height: `${height}%`,
                          backgroundColor: isGreen ? "rgb(34 197 94 / 0.3)" : "rgb(239 68 68 / 0.3)",
                          border: `1px solid ${isGreen ? "rgb(34 197 94)" : "rgb(239 68 68)"}`,
                        }}
                      />
                    )
                  })}
                </div>
                {/* Mock entry marker */}
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  <span>Entry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Copilot */}
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" />
                <span>AI Copilot</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Signal</div>
                  <div className="font-medium text-green-400">BUY EURUSD</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Confidence</div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[78%] bg-primary" />
                    </div>
                    <span className="text-xs">78%</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Reasons</div>
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Strong support level</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>RSI oversold</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Bullish trend</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini KPI Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Winrate</span>
            </div>
            <div className="text-xl font-bold">68.5%</div>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Wins</span>
            </div>
            <div className="text-xl font-bold">24 / 11</div>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="text-xl font-bold">3</div>
          </div>
        </div>
      </Card>
    </section>
  )
}
