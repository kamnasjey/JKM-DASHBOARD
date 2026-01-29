import { useMemo } from "react"
import type { Candle } from "@/lib/types"

/**
 * Timeframe configurations
 * Maps timeframe string to minutes
 */
const TIMEFRAME_MINUTES: Record<string, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
}

/**
 * Hook to resample M5 candles to higher timeframes
 *
 * Takes M5 candles as input and aggregates them into the target timeframe.
 * For M5 input, returns the candles as-is.
 *
 * @param m5Candles - Array of M5 candles (time in epoch seconds)
 * @param targetTimeframe - Target timeframe (M5, M15, M30, H1, H4)
 * @returns Resampled candles
 */
export function useCandleResampler(
  m5Candles: Candle[],
  targetTimeframe: string
): Candle[] {
  return useMemo(() => {
    // If already M5 or no candles, return as-is
    if (targetTimeframe === "M5" || m5Candles.length === 0) {
      return m5Candles
    }

    const targetMinutes = TIMEFRAME_MINUTES[targetTimeframe]
    if (!targetMinutes) {
      console.warn(`[useCandleResampler] Unknown timeframe: ${targetTimeframe}`)
      return m5Candles
    }

    // M5 is 5 minutes, so calculate how many M5 candles per target candle
    const barsPerCandle = targetMinutes / 5

    if (barsPerCandle <= 1) {
      return m5Candles
    }

    const resampled: Candle[] = []
    let currentCandle: Candle | null = null

    for (const candle of m5Candles) {
      // Calculate the period start time for this candle
      // e.g., for H1, align to the start of the hour
      const targetSeconds = targetMinutes * 60
      const periodStart = Math.floor(candle.time / targetSeconds) * targetSeconds

      if (!currentCandle || currentCandle.time !== periodStart) {
        // Start a new candle
        if (currentCandle) {
          resampled.push(currentCandle)
        }
        currentCandle = {
          time: periodStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0,
        }
      } else {
        // Aggregate into existing candle
        currentCandle.high = Math.max(currentCandle.high, candle.high)
        currentCandle.low = Math.min(currentCandle.low, candle.low)
        currentCandle.close = candle.close
        currentCandle.volume = (currentCandle.volume || 0) + (candle.volume || 0)
      }
    }

    // Don't forget the last candle
    if (currentCandle) {
      resampled.push(currentCandle)
    }

    return resampled
  }, [m5Candles, targetTimeframe])
}

/**
 * Pure function version (for use outside React components)
 */
export function resampleCandles(
  m5Candles: Candle[],
  targetTimeframe: string
): Candle[] {
  if (targetTimeframe === "M5" || m5Candles.length === 0) {
    return m5Candles
  }

  const targetMinutes = TIMEFRAME_MINUTES[targetTimeframe]
  if (!targetMinutes || targetMinutes <= 5) {
    return m5Candles
  }

  const targetSeconds = targetMinutes * 60
  const resampled: Candle[] = []
  let currentCandle: Candle | null = null

  for (const candle of m5Candles) {
    const periodStart = Math.floor(candle.time / targetSeconds) * targetSeconds

    if (!currentCandle || currentCandle.time !== periodStart) {
      if (currentCandle) {
        resampled.push(currentCandle)
      }
      currentCandle = {
        time: periodStart,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0,
      }
    } else {
      currentCandle.high = Math.max(currentCandle.high, candle.high)
      currentCandle.low = Math.min(currentCandle.low, candle.low)
      currentCandle.close = candle.close
      currentCandle.volume = (currentCandle.volume || 0) + (candle.volume || 0)
    }
  }

  if (currentCandle) {
    resampled.push(currentCandle)
  }

  return resampled
}

/**
 * Get the number of M5 candles needed for a given timeframe and candle count
 */
export function getM5CandlesNeeded(
  targetTimeframe: string,
  candleCount: number
): number {
  const targetMinutes = TIMEFRAME_MINUTES[targetTimeframe] || 5
  const barsPerCandle = targetMinutes / 5
  return Math.ceil(candleCount * barsPerCandle)
}
