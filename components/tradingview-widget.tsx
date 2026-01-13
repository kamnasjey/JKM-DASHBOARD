"use client"

import { useEffect, useRef, memo } from "react"

interface TradingViewWidgetProps {
  symbol: string
  theme?: "dark" | "light"
  interval?: string
  height?: number | string
  width?: string
  showToolbar?: boolean
}

// Map our symbols to TradingView format
function mapSymbolToTV(symbol: string): string {
  const s = symbol.toUpperCase()
  
  // Forex pairs
  if (s === "EURUSD") return "FX:EURUSD"
  if (s === "GBPUSD") return "FX:GBPUSD"
  if (s === "USDJPY") return "FX:USDJPY"
  if (s === "USDCHF") return "FX:USDCHF"
  if (s === "USDCAD") return "FX:USDCAD"
  if (s === "AUDUSD") return "FX:AUDUSD"
  if (s === "NZDUSD") return "FX:NZDUSD"
  if (s === "EURJPY") return "FX:EURJPY"
  if (s === "GBPJPY") return "FX:GBPJPY"
  if (s === "EURGBP") return "FX:EURGBP"
  if (s === "AUDJPY") return "FX:AUDJPY"
  if (s === "EURAUD") return "FX:EURAUD"
  if (s === "EURCHF") return "FX:EURCHF"
  
  // Gold/Silver/Commodities
  if (s === "XAUUSD") return "OANDA:XAUUSD"
  if (s === "XAGUSD") return "OANDA:XAGUSD"
  
  // Crypto
  if (s === "BTCUSD") return "COINBASE:BTCUSD"
  if (s === "ETHUSD") return "COINBASE:ETHUSD"
  
  // Default - try FX
  return `FX:${s}`
}

// Map our timeframe to TradingView format
function mapIntervalToTV(interval: string): string {
  const i = interval.toUpperCase()
  if (i === "M1" || i === "1M" || i === "1") return "1"
  if (i === "M5" || i === "5M" || i === "5") return "5"
  if (i === "M15" || i === "15M" || i === "15") return "15"
  if (i === "M30" || i === "30M" || i === "30") return "30"
  if (i === "H1" || i === "1H" || i === "60") return "60"
  if (i === "H4" || i === "4H" || i === "240") return "240"
  if (i === "D" || i === "D1" || i === "1D") return "D"
  if (i === "W" || i === "W1" || i === "1W") return "W"
  return "60" // default to 1 hour
}

function TradingViewWidgetComponent({
  symbol,
  theme = "dark",
  interval = "60",
  height = 500,
  width = "100%",
  showToolbar = true,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ""
    
    const tvSymbol = mapSymbolToTV(symbol)
    const tvInterval = mapIntervalToTV(interval)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Asia/Ulaanbaatar",
      theme: theme,
      style: "1", // Candlestick
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: !showToolbar,
      hide_legend: false,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
      // Drawing tools enabled by default
      withdateranges: true,
      details: true,
      hotlist: false,
      studies: [],
      container_id: `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`,
    })

    containerRef.current.appendChild(script)
    scriptRef.current = script

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
      }
    }
  }, [symbol, theme, interval, showToolbar])

  return (
    <div className="tradingview-widget-container" style={{ height, width }}>
      <div
        ref={containerRef}
        id={`tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
