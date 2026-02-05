/**
 * Hook for fetching multi-timeframe market regime for symbols
 *
 * Fetches candle data for 1H, 4H, 1D timeframes and calculates
 * market regime using EMA20/EMA50 crossover strategy.
 */

import { useState, useEffect, useCallback } from "react"
import {
  MarketRegime,
  TimeframeRegime,
  calculateRegimeFromCandles,
  getRegimeDisplay,
  getIncompatibleDetectors,
} from "@/lib/detectors/regime-compatibility"

const REGIME_TIMEFRAMES = ["H1", "H4", "D1"] as const
const REGIME_LABELS: Record<string, string> = {
  H1: "1H",
  H4: "4H",
  D1: "1D",
}

interface SymbolRegimeData {
  symbol: string
  regimes: TimeframeRegime[]
  loading: boolean
  error?: string
}

interface UseSymbolRegimesResult {
  regimes: Record<string, SymbolRegimeData>
  loading: boolean
  refresh: () => void
}

/**
 * Fetch candles for a symbol/timeframe
 */
async function fetchCandles(
  symbol: string,
  tf: string
): Promise<Array<{ o: number; h: number; l: number; c: number }>> {
  const res = await fetch(`/api/proxy/markets/${symbol}/candles?tf=${tf}&limit=100`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${symbol} ${tf}`)
  }
  const data = await res.json()
  // Backend returns { candles: [...] } or array directly
  const candles = data.candles || data
  if (!Array.isArray(candles)) {
    throw new Error("Invalid candles response")
  }
  return candles
}

/**
 * Hook to fetch and calculate market regimes for symbols
 */
export function useSymbolRegimes(symbols: string[]): UseSymbolRegimesResult {
  const [regimes, setRegimes] = useState<Record<string, SymbolRegimeData>>({})
  const [loading, setLoading] = useState(false)

  const fetchSymbolRegime = useCallback(async (symbol: string) => {
    const timeframeRegimes: TimeframeRegime[] = []

    for (const tf of REGIME_TIMEFRAMES) {
      try {
        const candles = await fetchCandles(symbol, tf)
        const regime = calculateRegimeFromCandles(candles)
        timeframeRegimes.push({
          timeframe: REGIME_LABELS[tf],
          regime,
          display: getRegimeDisplay(regime),
        })
      } catch {
        timeframeRegimes.push({
          timeframe: REGIME_LABELS[tf],
          regime: "unknown" as MarketRegime,
          display: getRegimeDisplay("unknown"),
        })
      }
    }

    return {
      symbol,
      regimes: timeframeRegimes,
      loading: false,
    }
  }, [])

  const refresh = useCallback(async () => {
    if (symbols.length === 0) return

    setLoading(true)

    // Initialize loading state for all symbols
    const initialState: Record<string, SymbolRegimeData> = {}
    for (const symbol of symbols) {
      initialState[symbol] = {
        symbol,
        regimes: [],
        loading: true,
      }
    }
    setRegimes(initialState)

    // Fetch in parallel with concurrency limit
    const concurrency = 3
    const results: Record<string, SymbolRegimeData> = {}

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            return await fetchSymbolRegime(symbol)
          } catch (err) {
            return {
              symbol,
              regimes: [],
              loading: false,
              error: String(err),
            }
          }
        })
      )

      for (const result of batchResults) {
        results[result.symbol] = result
      }

      // Update state progressively
      setRegimes((prev) => ({ ...prev, ...results }))
    }

    setLoading(false)
  }, [symbols, fetchSymbolRegime])

  // Fetch on mount and when symbols change
  useEffect(() => {
    refresh()
  }, [symbols.join(",")]) // Only refetch when symbols array changes

  return { regimes, loading, refresh }
}

/**
 * Get detector warnings for a symbol based on its regimes
 */
export function getSymbolDetectorWarnings(
  regimeData: SymbolRegimeData | undefined,
  detectors: string[]
): Array<{ timeframe: string; regime: MarketRegime; incompatible: string[] }> {
  if (!regimeData || regimeData.regimes.length === 0) return []

  return regimeData.regimes
    .filter((r) => r.regime !== "unknown")
    .map((r) => ({
      timeframe: r.timeframe,
      regime: r.regime,
      incompatible: getIncompatibleDetectors(detectors, r.regime).map((d) => d.id),
    }))
    .filter((w) => w.incompatible.length > 0)
}

/**
 * Format regime display text for a symbol
 * Example: "1H: ↑ trend | 4H: ↑ trend | 1D: ↔ range"
 */
export function formatRegimeText(regimeData: SymbolRegimeData | undefined): string {
  if (!regimeData || regimeData.regimes.length === 0) {
    return "Loading..."
  }

  return regimeData.regimes
    .map((r) => `${r.timeframe}: ${r.display.icon}`)
    .join(" | ")
}

/**
 * Format regime warning text
 */
export function formatWarningText(
  warnings: Array<{ timeframe: string; regime: MarketRegime; incompatible: string[] }>
): string {
  if (warnings.length === 0) return ""

  return warnings
    .map((w) => `${w.timeframe} ${w.regime} - ${w.incompatible.join(", ")} ажиллахгүй`)
    .join(" | ")
}
