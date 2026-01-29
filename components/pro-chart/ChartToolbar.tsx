"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MousePointer2,
  Minus,
  TrendingUp,
  Grid3X3,
  Square,
  Trash2,
  RefreshCw,
  List,
  X,
} from "lucide-react"
import { useChartContext } from "./ChartContext"
import { TIMEFRAMES, type DrawingTool } from "./types"

interface ChartToolbarProps {
  symbols: string[]
  onClearAll?: () => void
  onRefresh?: () => void
  onDeleteDrawing?: (id: string) => void
  loading?: boolean
}

const TOOLS: {
  tool: DrawingTool
  icon: typeof MousePointer2
  label: string
  shortcut?: string
}[] = [
  { tool: "cursor", icon: MousePointer2, label: "Select", shortcut: "V" },
  { tool: "horizontal_line", icon: Minus, label: "Horizontal Line", shortcut: "H" },
  { tool: "trend_line", icon: TrendingUp, label: "Trend Line", shortcut: "T" },
  { tool: "fibonacci", icon: Grid3X3, label: "Fibonacci", shortcut: "F" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
]

export function ChartToolbar({
  symbols,
  onClearAll,
  onRefresh,
  onDeleteDrawing,
  loading = false,
}: ChartToolbarProps) {
  const { state, setSymbol, setTimeframe, setActiveTool } = useChartContext()

  // Check if currently drawing (for two-point tools)
  const isDrawingInProgress = state.isDrawing && state.activeTool !== "cursor"

  // Get tool icon for drawing list
  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "horizontal_line": return <Minus className="h-3 w-3" />
      case "trend_line": return <TrendingUp className="h-3 w-3" />
      case "fibonacci": return <Grid3X3 className="h-3 w-3" />
      case "rectangle": return <Square className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      {/* Left: Symbol & Timeframe */}
      <div className="flex items-center gap-2">
        <Select value={state.symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-8 w-[110px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {symbols.map(symbol => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf.value}
              variant={state.timeframe === tf.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeframe(tf.value)}
              className="h-8 px-2.5 text-xs"
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Center: Drawing Tools */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          {TOOLS.map(({ tool, icon: Icon, label, shortcut }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={state.activeTool === tool ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTool(tool)}
                  className="h-7 w-7 p-0"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{label}</span>
                {shortcut && (
                  <span className="ml-2 text-muted-foreground">({shortcut})</span>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="mx-1 h-5 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                disabled={state.drawings.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear All Drawings</TooltipContent>
          </Tooltip>

          {/* Drawing in progress indicator */}
          {isDrawingInProgress && (
            <div className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Click 2nd point (ESC цуцлах)
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Right: Info & Actions */}
      <div className="flex items-center gap-2">
        {/* Drawings list dropdown */}
        {state.drawings.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
                <List className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {state.drawings.length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {state.drawings.map(drawing => (
                <DropdownMenuItem
                  key={drawing.id}
                  className="flex items-center justify-between"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: drawing.color }}
                    />
                    {getToolIcon(drawing.tool)}
                    <span className="text-xs">
                      {drawing.tool === "horizontal_line" && "price" in drawing
                        ? `@ ${(drawing as any).price.toFixed(2)}`
                        : drawing.label || drawing.tool.replace(/_/g, " ")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDrawing?.(drawing.id)
                    }}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {state.drawings.length === 0 && (
          <span className="text-xs text-muted-foreground">No drawings</span>
        )}

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh Data</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
