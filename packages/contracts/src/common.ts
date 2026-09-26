import { z } from "zod"

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  details: z.unknown().optional(),
}) satisfies z.ZodType<ApiError>

export interface ApiError {
  code: string
  message: string
  requestId: string
  details?: unknown
}
