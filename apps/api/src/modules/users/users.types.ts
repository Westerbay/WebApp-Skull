import type { CurrentUser } from "@workspace/contracts/identity"
import type {
  CursorPage,
  CursorPagination,
} from "@workspace/contracts/pagination"

export const LIST_USERS = Symbol("LIST_USERS")
export type ListUsers = (
  query: CursorPagination
) => Promise<CursorPage<CurrentUser>>
