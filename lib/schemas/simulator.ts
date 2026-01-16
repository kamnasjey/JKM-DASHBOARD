/**
 * Zod schemas for Strategy Simulator API
 * 
 * @module lib/schemas/simulator
 */

import { z } from "zod"

// ============================================
// Input Schemas
// ============================================

/**
 * Request schema for POST /api/simulator/run
 */
export const SimulatorRunRequestSchema = z.object({
  strategyId: z.string().min(1, "Strategy ID is required"),
  
  symbols: z
    .array(z.string().min(1))
    .min(1, "At least one symbol is required")
    .max(10, "Maximum 10 symbols allowed"),
  
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date YYYY-MM-DD"),
  
  // Optional: if absent -> "auto"
  timeframe: z.enum(["auto", "5m", "15m", "1h", "4h", "1d"]).optional().default("auto"),
  
  // Optional: default "winrate"
  mode: z.enum(["winrate", "detailed"]).optional().default("winrate"),
  
  // Optional: force demo mode (proceed even with data gaps)
  demoMode: z.boolean().optional().default(false),
})

export type SimulatorRunRequest = z.infer<typeof SimulatorRunRequestSchema>

/**
 * Validate simulator run request
 */
export function validateSimulatorRequest(data: unknown) {
  return SimulatorRunRequestSchema.safeParse(data)
}

// ============================================
// Output Schemas (for type reference)
// ============================================

export const HorizonSummarySchema = z.object({
  entries: z.number(),
  tp: z.number(),
  sl: z.number(),
  open: z.number(),
  winrate: z.number(),
})

export const SuggestionSchema = z.object({
  title: z.string(),
  why: z.string(),
  how: z.string(),
})

export const SimulatorResultSchema = z.object({
  ok: z.boolean(),
  summary: z.object({
    entries: z.number(),
    tp: z.number(),
    sl: z.number(),
    open: z.number(),
    winrate: z.number(),
  }).optional(),
  byHorizon: z.object({
    intraday: HorizonSummarySchema.optional(),
    swing: HorizonSummarySchema.optional(),
  }).optional(),
  suggestions: z.array(SuggestionSchema).optional(),
  meta: z.object({
    baseTimeframe: z.string(),
    range: z.object({
      from: z.string(),
      to: z.string(),
    }),
    demoMode: z.boolean(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
})

export type SimulatorResult = z.infer<typeof SimulatorResultSchema>
export type HorizonSummary = z.infer<typeof HorizonSummarySchema>
export type Suggestion = z.infer<typeof SuggestionSchema>

// ============================================
// Helpers
// ============================================

/**
 * Format Zod errors into a readable object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".")
    formatted[path || "_root"] = issue.message
  }
  return formatted
}

/**
 * Calculate date range in days
 */
export function getDateRangeDays(from: string, to: string): number {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffMs = toDate.getTime() - fromDate.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Limit date range to last N days within the provided window (for demo mode)
 */
export function limitDateRange(from: string, to: string, maxDays: number): { from: string; to: string } {
  const toDate = new Date(to)
  const fromDate = new Date(from)
  
  const diffMs = toDate.getTime() - fromDate.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays <= maxDays) {
    return { from, to }
  }
  
  // Limit to last maxDays from `to` date
  const newFrom = new Date(toDate.getTime() - maxDays * 24 * 60 * 60 * 1000)
  return {
    from: newFrom.toISOString().slice(0, 10),
    to,
  }
}
