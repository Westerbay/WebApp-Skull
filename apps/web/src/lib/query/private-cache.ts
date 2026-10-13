import type { QueryClient } from "@tanstack/react-query"
import { privateQueryKeyPrefix } from "./query-keys"

export async function clearPrivateCache(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: privateQueryKeyPrefix })
  queryClient.removeQueries({ queryKey: privateQueryKeyPrefix })
}
