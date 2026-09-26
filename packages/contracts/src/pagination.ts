import { z } from "zod"
import { cursorPaginationConstraints } from "@workspace/contracts/pagination/constraints"

export const cursorSchema = z
  .string()
  .min(cursorPaginationConstraints.minCursorLength)
  .max(cursorPaginationConstraints.maxCursorLength)

export const cursorPaginationSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(cursorPaginationConstraints.minLimit)
    .max(cursorPaginationConstraints.maxLimit)
    .default(cursorPaginationConstraints.defaultLimit),
}) satisfies z.ZodType<CursorPagination>

export function cursorPageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: cursorSchema.nullable() })
}

export interface CursorPagination {
  cursor?: string
  limit: number
}
export type CursorPage<T> = { items: Array<T>; nextCursor: string | null }
