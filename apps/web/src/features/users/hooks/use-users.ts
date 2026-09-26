import { apiClient } from "@/lib/api/client"
import { privateQueryKeyPrefix } from "@/lib/query/query-keys"
import {
  cursorInfiniteQueryOptions,
  useCursorInfiniteQuery,
} from "@/lib/query/use-cursor-infinite-query"
import type { CurrentUser } from "@workspace/contracts/identity"
import type { CursorQueryOptions } from "@/lib/query/use-cursor-infinite-query"

export function usersQueryOptions(limit = 20): CursorQueryOptions<CurrentUser> {
  return {
    queryKey: [...privateQueryKeyPrefix, "users", { limit }],
    queryFn: async ({ pageParam, signal }) => {
      const { data, response } = await apiClient.GET("/api/users", {
        params: {
          query: { limit, ...(pageParam ? { cursor: pageParam } : {}) },
        },
        signal,
      })
      if (!response.ok || !data) throw new Error("Unable to load users")
      return data
    },
    retry: false,
  }
}

export function usersInfiniteQueryOptions(limit = 20) {
  return cursorInfiniteQueryOptions(usersQueryOptions(limit))
}

export function useUsers(limit = 20) {
  return useCursorInfiniteQuery(usersQueryOptions(limit))
}
