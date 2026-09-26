import { apiClient } from "@/lib/api/client"
import { privateQueryKeyPrefix } from "@/lib/query/query-keys"
import { useCursorInfiniteQuery } from "@/lib/query/use-cursor-infinite-query"
import { usersTableConfig } from "../users.config"
import type { CurrentUser } from "@workspace/contracts/identity"
import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query"
import type { CursorQueryOptions } from "@/lib/query/use-cursor-infinite-query"

export function usersQueryOptions(
  limit = usersTableConfig.pageSize
): CursorQueryOptions<CurrentUser> {
  async function fetchUsersPage({
    pageParam,
    signal,
  }: QueryFunctionContext<QueryKey, string | undefined>) {
    const { data, response } = await apiClient.GET("/api/users", {
      params: { query: { limit, cursor: pageParam } },
      signal,
    })
    if (!response.ok || !data) throw new Error("Unable to load users")
    return data
  }

  return {
    queryKey: [...privateQueryKeyPrefix, "users", { limit }],
    queryFn: fetchUsersPage,
    retry: false,
  }
}

export function useUsers(limit = usersTableConfig.pageSize) {
  return useCursorInfiniteQuery(usersQueryOptions(limit))
}
