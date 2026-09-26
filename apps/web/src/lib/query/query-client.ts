import { QueryClient } from "@tanstack/react-query"
import { queryConfig } from "./query.config"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: queryConfig.staleTimeMs,
        retry: queryConfig.queryRetryCount,
        refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
      },
      mutations: {
        retry: queryConfig.mutationRetryCount,
      },
    },
  })
}
