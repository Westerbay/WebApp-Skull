import { cursorPaginationConstraints } from "@workspace/contracts/pagination/constraints"

export const usersTableConfig = {
  pageSize: cursorPaginationConstraints.defaultLimit,
  searchDebounceMs: 300,
}
