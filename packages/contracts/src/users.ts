import { z } from "zod"
import { currentUserSchema } from "@workspace/contracts/identity"
import {
  cursorPageSchema,
  cursorPaginationSchema,
} from "@workspace/contracts/pagination"
import { usersSearchConstraints } from "@workspace/contracts/users/constraints"

export const usersQuerySchema = cursorPaginationSchema.extend({
  search: z.string().trim().max(usersSearchConstraints.maxLength).optional(),
})

export type UsersQuery = z.infer<typeof usersQuerySchema>

export const usersPageSchema = cursorPageSchema(currentUserSchema)
