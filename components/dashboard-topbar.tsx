"use client"

import { useState } from "react"
import { Bell, LogOut, Menu, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSymbols } from "@/hooks/use-symbols"
import { useWebSocketCandle } from "@/hooks/use-websocket-candle"
import { useToast } from "@/hooks/use-toast"
import { clearToken } from "@/lib/api"
import { useRouter } from "next/navigation"

interface TopbarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
  selectedSymbol: string
  onSymbolChange: (symbol: string) => void
}

export function DashboardTopbar({ user, selectedSymbol, onSymbolChange }: TopbarProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { symbols, error: symbolsError } = useSymbols()
  const { connected, lastUpdate } = useWebSocketCandle(selectedSymbol)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    clearToken()
    toast({
      title: "Гарлаа",
      description: "Амжилттай гарлаа",
    })
    router.push("/login")
  }

  const getLatency = () => {
    if (!lastUpdate) return "N/A"
    const diff = Date.now() - lastUpdate.getTime()
    return `${Math.round(diff / 1000)}s`
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {symbolsError ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">API алдаа</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Symbols ачаалж чадсангүй</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <Select value={selectedSymbol} onValueChange={onSymbolChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                5m
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={connected ? "default" : "destructive"} className="hidden sm:inline-flex">
          {connected ? "Холбогдсон" : "Холбогдоогүй"}
        </Badge>
        {connected && lastUpdate && (
          <span className="hidden text-xs text-muted-foreground md:inline">Сүүлд шинэчлэгдсэн: {getLatency()}</span>
        )}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline">{user?.name || "User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Миний бүртгэл</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Гарах</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
