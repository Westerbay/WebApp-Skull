import { z } from "zod"

export const cursorSchema = z.string().min(1).max(256)
export const cursorPaginationSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export function cursorPageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: cursorSchema.nullable() })
}

export type CursorPagination = z.infer<typeof cursorPaginationSchema>
export type CursorPage<T> = { items: Array<T>; nextCursor: string | null }
