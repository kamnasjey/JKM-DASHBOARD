"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, TrendingUp, TrendingDown, Target, DollarSign, Percent, Timer, BarChart3 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuthGuard } from "@/lib/auth-guard"
import Link from "next/link"

interface Trade {
  trade_id: string
  entry_time: number
  entry_price: number
  direction: string
  detector: string
  exit_time?: number
  exit_price?: number
  stop_loss: number
  take_profit: number
  risk_pips: number
  reward_pips: number
  rr_ratio: number
  outcome: string
  pnl_pips: number
  pnl_usd: number
  bars_in_trade: number
}

interface EquityPoint {
  timestamp: number
  equity: number
  drawdown: number
  trade_id?: string
}

interface RunMetrics {
  total_trades: number
  winning_trades: number
  losing_trades: number
  breakeven_trades: number
  timeout_trades: number
  win_rate: number
  total_pnl_pips: number
  total_pnl_usd: number
  avg_win_pips: number
  avg_loss_pips: number
  profit_factor: number
  max_drawdown_pct: number
  max_drawdown_usd: number
  sharpe_ratio: number
  sortino_ratio: number
  total_spread_cost: number
  total_slippage_cost: number
  total_commission: number
  avg_bars_in_trade: number
  avg_rr_achieved: number
  best_trade_pips: number
  worst_trade_pips: number
  detector_stats: Record<string, {
    total_trades: number
    wins: number
    win_rate: number
    pnl_pips: number
    pnl_usd: number
  }>
}

interface TesterRun {
  run_id: string
  created_at: string
  status: string
  trade_count: number
  config_hash: string
  data_hash: string
  duration_seconds: number
  started_at?: string
  completed_at?: string
  metrics?: RunMetrics
  trades: Trade[]
  equity_curve: EquityPoint[]
  config_details?: {
    symbol: string
    detectors: string[]
    entry_tf: string
    trend_tf: string
    spread_pips: number
    slippage_pips: number
    initial_capital: number
    intrabar_policy: string
    min_rr: number
  }
}

export default function TesterRunPage({ params }: { params: Promise<{ runId: string }> }) {
  useAuthGuard(true)
  
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [run, setRun] = useState<TesterRun | null>(null)
  
  useEffect(() => {
    loadRun()
  }, [resolvedParams.runId])
  
  const loadRun = async () => {
    try {
      const result = await api.strategyTester.getRun(resolvedParams.runId)
      if (result.ok) {
        setRun(result.run)
      }
    } catch (err) {
      console.error("Failed to load run:", err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!run) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Run not found</p>
          <Button asChild className="mt-4">
            <Link href="/tester">Back to Tester</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }
  
  const metrics = run.metrics
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tester">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-mono">{run.run_id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              {new Date(run.created_at).toLocaleString()} · {run.duration_seconds.toFixed(1)}s
            </p>
          </div>
          <Badge variant={run.status === "completed" ? "default" : "destructive"}>
            {run.status}
          </Badge>
        </div>
        
        {/* Config Summary */}
        {run.config_details && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{run.config_details.symbol}</Badge>
            <Badge variant="outline">{run.config_details.entry_tf}/{run.config_details.trend_tf}</Badge>
            <Badge variant="outline">Spread: {run.config_details.spread_pips}p</Badge>
            <Badge variant="outline">RR≥{run.config_details.min_rr}</Badge>
            <Badge variant="outline">{run.config_details.intrabar_policy}</Badge>
            {run.config_details.detectors?.map(d => (
              <Badge key={d} variant="secondary">{d}</Badge>
            ))}
          </div>
        )}
        
        {/* Metrics Overview */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                </div>
                <p className="text-2xl font-bold mt-1">{metrics.total_trades}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.winning_trades}W / {metrics.losing_trades}L / {metrics.timeout_trades}T
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${metrics.win_rate >= 0.5 ? "text-green-500" : "text-red-500"}`}>
                  {(metrics.win_rate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  PF: {metrics.profit_factor.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total P/L</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${metrics.total_pnl_usd >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${metrics.total_pnl_usd.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics.total_pnl_pips.toFixed(1)} pips
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Max Drawdown</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-orange-500">
                  {metrics.max_drawdown_pct.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  ${metrics.max_drawdown_usd.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Additional Metrics */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-lg font-bold">{metrics.sharpe_ratio.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Sortino Ratio</p>
                <p className="text-lg font-bold">{metrics.sortino_ratio.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Avg Bars in Trade</p>
                <p className="text-lg font-bold">{metrics.avg_bars_in_trade.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Execution Costs</p>
                <p className="text-lg font-bold">
                  {(metrics.total_spread_cost + metrics.total_slippage_cost + metrics.total_commission).toFixed(1)}p
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Detector Stats */}
        {metrics?.detector_stats && Object.keys(metrics.detector_stats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detector Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Detector</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">P/L (pips)</TableHead>
                    <TableHead className="text-right">P/L ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(metrics.detector_stats).map(([name, stats]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">{stats.total_trades}</TableCell>
                      <TableCell className="text-right">{stats.wins}</TableCell>
                      <TableCell className="text-right">
                        <span className={stats.win_rate >= 0.5 ? "text-green-500" : "text-red-500"}>
                          {(stats.win_rate * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{stats.pnl_pips.toFixed(1)}</TableCell>
                      <TableCell className={`text-right ${stats.pnl_usd >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${stats.pnl_usd.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs for Trades and Equity */}
        <Tabs defaultValue="trades">
          <TabsList>
            <TabsTrigger value="trades">
              Trades ({run.trades.length})
            </TabsTrigger>
            <TabsTrigger value="equity">
              Equity Curve
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trades" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entry</TableHead>
                        <TableHead>Detector</TableHead>
                        <TableHead>Dir</TableHead>
                        <TableHead className="text-right">Entry</TableHead>
                        <TableHead className="text-right">SL</TableHead>
                        <TableHead className="text-right">TP</TableHead>
                        <TableHead className="text-right">R:R</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">P/L</TableHead>
                        <TableHead className="text-right">Bars</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {run.trades.slice(0, 100).map(trade => (
                        <TableRow key={trade.trade_id}>
                          <TableCell className="text-xs">
                            {new Date(trade.entry_time * 1000).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {trade.detector}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {trade.direction === "long" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {trade.entry_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-red-400">
                            {trade.stop_loss.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-400">
                            {trade.take_profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {trade.rr_ratio.toFixed(1)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trade.outcome === "win" ? "default" :
                                trade.outcome === "loss" ? "destructive" :
                                "secondary"
                              }
                              className="text-xs"
                            >
                              {trade.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${
                            trade.pnl_usd >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                            ${trade.pnl_usd.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {trade.bars_in_trade}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {run.trades.length > 100 && (
                  <div className="p-4 text-center text-muted-foreground">
                    Showing first 100 of {run.trades.length} trades
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Equity Curve
                </CardTitle>
                <CardDescription>
                  {run.equity_curve.length} data points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {run.equity_curve.length > 0 ? (
                  <div className="h-64 flex items-end gap-px">
                    {/* Simple bar chart visualization */}
                    {run.equity_curve.slice(-100).map((point, idx) => {
                      const min = Math.min(...run.equity_curve.map(p => p.equity))
                      const max = Math.max(...run.equity_curve.map(p => p.equity))
                      const range = max - min || 1
                      const height = ((point.equity - min) / range) * 100
                      const isPositive = point.equity >= (run.config_details?.initial_capital || 10000)
                      
                      return (
                        <div
                          key={idx}
                          className={`flex-1 ${isPositive ? "bg-green-500" : "bg-red-500"} opacity-80`}
                          style={{ height: `${height}%` }}
                          title={`$${point.equity.toFixed(2)} at ${new Date(point.timestamp * 1000).toLocaleString()}`}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No equity curve data
                  </div>
                )}
                
                {/* Min/Max labels */}
                {run.equity_curve.length > 0 && (
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      Start: ${run.equity_curve[0]?.equity.toFixed(2)}
                    </span>
                    <span>
                      Peak: ${Math.max(...run.equity_curve.map(p => p.equity)).toFixed(2)}
                    </span>
                    <span>
                      End: ${run.equity_curve[run.equity_curve.length - 1]?.equity.toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
