import { currentUserSchema } from "@workspace/contracts/identity"
import { cursorPageSchema } from "@workspace/contracts/pagination"

export const usersPageSchema = cursorPageSchema(currentUserSchema)
