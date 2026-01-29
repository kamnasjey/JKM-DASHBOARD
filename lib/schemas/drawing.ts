import { z } from "zod"

/**
 * Chart Drawing Zod Schemas
 *
 * Data model: users/{uid}/drawings/{drawingId}
 */

// Drawing tool types
export const DrawingToolSchema = z.enum([
  "horizontal_line",
  "trend_line",
  "fibonacci",
  "rectangle"
])

// Line style types
export const LineStyleSchema = z.enum(["solid", "dashed", "dotted"])

// Fibonacci levels (common values)
const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

// Base drawing fields (common to all tools)
const BaseDrawingSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  tool: DrawingToolSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#f59e0b"),
  lineWidth: z.number().int().min(1).max(5).default(1),
  lineStyle: LineStyleSchema.default("solid"),
  label: z.string().max(50).optional(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
})

// Horizontal line specific
export const HorizontalLineSchema = BaseDrawingSchema.extend({
  tool: z.literal("horizontal_line"),
  price: z.number(),
})

// Trend line specific
export const TrendLineSchema = BaseDrawingSchema.extend({
  tool: z.literal("trend_line"),
  startTime: z.number(),
  startPrice: z.number(),
  endTime: z.number(),
  endPrice: z.number(),
})

// Fibonacci retracement specific
export const FibonacciSchema = BaseDrawingSchema.extend({
  tool: z.literal("fibonacci"),
  startTime: z.number(),
  startPrice: z.number(),
  endTime: z.number(),
  endPrice: z.number(),
  levels: z.array(z.number()).default(DEFAULT_FIB_LEVELS),
})

// Rectangle/box specific
export const RectangleSchema = BaseDrawingSchema.extend({
  tool: z.literal("rectangle"),
  startTime: z.number(),
  startPrice: z.number(),
  endTime: z.number(),
  endPrice: z.number(),
  fillColor: z.string().optional(), // rgba with alpha
})

// Union of all drawing types for creation
export const CreateDrawingSchema = z.discriminatedUnion("tool", [
  HorizontalLineSchema,
  TrendLineSchema,
  FibonacciSchema,
  RectangleSchema,
])

// Update drawing payload (partial, tool cannot change)
export const UpdateDrawingSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lineWidth: z.number().int().min(1).max(5).optional(),
  lineStyle: LineStyleSchema.optional(),
  label: z.string().max(50).optional().nullable(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  // Tool-specific coordinates (can be updated)
  price: z.number().optional(),
  startTime: z.number().optional(),
  startPrice: z.number().optional(),
  endTime: z.number().optional(),
  endPrice: z.number().optional(),
  levels: z.array(z.number()).optional(),
  fillColor: z.string().optional().nullable(),
})

// Full drawing document (as stored in Firestore)
export const DrawingDocSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  tool: DrawingToolSchema,
  color: z.string(),
  lineWidth: z.number(),
  lineStyle: LineStyleSchema,
  label: z.string().optional().nullable(),
  visible: z.boolean(),
  locked: z.boolean(),
  // Tool-specific fields (optional based on tool type)
  price: z.number().optional(),
  startTime: z.number().optional(),
  startPrice: z.number().optional(),
  endTime: z.number().optional(),
  endPrice: z.number().optional(),
  levels: z.array(z.number()).optional(),
  fillColor: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
})

// Types
export type DrawingTool = z.infer<typeof DrawingToolSchema>
export type LineStyle = z.infer<typeof LineStyleSchema>
export type CreateDrawingInput = z.infer<typeof CreateDrawingSchema>
export type UpdateDrawingInput = z.infer<typeof UpdateDrawingSchema>
export type DrawingDoc = z.infer<typeof DrawingDocSchema>

// Validation helpers
export function validateCreateDrawing(data: unknown) {
  return CreateDrawingSchema.safeParse(data)
}

export function validateUpdateDrawing(data: unknown) {
  return UpdateDrawingSchema.safeParse(data)
}

// Format Zod errors for API response
export function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}
