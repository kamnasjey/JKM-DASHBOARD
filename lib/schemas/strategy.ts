import { z } from "zod"

/**
 * Strategy Zod Schemas
 * 
 * Data model: users/{uid}/strategies/{strategyId}
 */

// Detector validation: must be non-empty strings
const DetectorSchema = z.string().min(1, "Detector name cannot be empty")

// Strategy config object (flexible structure)
export const StrategyConfigSchema = z.object({
  min_score: z.number().min(0).max(100).optional().default(1.0),
  min_rr: z.number().min(0).max(50).optional().default(2.0),
  allowed_regimes: z.array(z.string()).optional(),
  detector_weights: z.record(z.string(), z.number()).optional(),
  family_weights: z.record(z.string(), z.number()).optional(),
  conflict_epsilon: z.number().min(0).max(1).optional(),
  confluence_bonus_per_family: z.number().min(0).max(5).optional(),
  engine_version: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
}).passthrough() // Allow additional fields

// Create strategy payload
export const CreateStrategySchema = z.object({
  name: z.string().min(1, "Strategy name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional().default(true),
  detectors: z.array(DetectorSchema).min(1, "At least 1 detector required").max(15, "Max 15 detectors"),
  symbols: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  config: StrategyConfigSchema.optional().default({}),
})

// Update strategy payload (all fields optional except what's being updated)
export const UpdateStrategySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  detectors: z.array(DetectorSchema).min(1).max(15).optional(),
  symbols: z.array(z.string()).optional().nullable(),
  timeframe: z.string().optional().nullable(),
  config: StrategyConfigSchema.optional(),
})

// Full strategy document (as stored in Firestore)
export const StrategyDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  enabled: z.boolean(),
  detectors: z.array(z.string()),
  symbols: z.array(z.string()).optional().nullable(),
  timeframe: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  version: z.number().int().optional().default(1),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  lastRunAt: z.string().or(z.date()).optional().nullable(),
})

// Types
export type CreateStrategyInput = z.infer<typeof CreateStrategySchema>
export type UpdateStrategyInput = z.infer<typeof UpdateStrategySchema>
export type StrategyDoc = z.infer<typeof StrategyDocSchema>

// Validation helpers
export function validateCreateStrategy(data: unknown) {
  return CreateStrategySchema.safeParse(data)
}

export function validateUpdateStrategy(data: unknown) {
  return UpdateStrategySchema.safeParse(data)
}

// Format Zod errors for API response
export function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}
