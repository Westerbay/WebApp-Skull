import { queryOptions } from "@tanstack/react-query"
import { queryConfig } from "../query/query.config"
import { httpStatus } from "@/lib/api/http-status"
import type { QueryClient } from "@tanstack/react-query"

import { apiClient } from "../api/client"
import { privateQueryKeyPrefix } from "../query/query-keys"

export class AuthenticationRequiredError extends Error {}

export const currentUserQueryOptions = queryOptions({
  queryKey: [...privateQueryKeyPrefix, "auth", "current-user"],
  queryFn: async ({ signal }) => {
    const { data, response } = await apiClient.GET("/api/me", { signal })

    if (
      response.status === httpStatus.unauthorized ||
      response.status === httpStatus.forbidden
    ) {
      throw new AuthenticationRequiredError("Authentication required")
    }

    if (!response.ok || !data) {
      throw new Error("Unable to load the authenticated user")
    }

    return data
  },
  retry: false,
  staleTime: queryConfig.staleTimeMs,
})

export function loadCurrentUserForProtectedRoute(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    ...currentUserQueryOptions,
    staleTime: 0,
  })
}

export async function clearPrivateCache(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: privateQueryKeyPrefix })
  queryClient.removeQueries({ queryKey: privateQueryKeyPrefix })
}
