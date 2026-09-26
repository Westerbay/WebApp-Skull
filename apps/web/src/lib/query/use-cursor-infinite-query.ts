import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query"
import type { CursorPage } from "@workspace/contracts/pagination"
import type {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query"

export type CursorQueryOptions<
  T,
  TData = InfiniteData<CursorPage<T>, string | undefined>,
> = Omit<
  UseInfiniteQueryOptions<
    CursorPage<T>,
    Error,
    TData,
    QueryKey,
    string | undefined
  >,
  "initialPageParam" | "getNextPageParam"
>

function getNextPageCursor<T>(page: CursorPage<T>): string | undefined {
  return page.nextCursor ?? undefined
}

export function cursorInfiniteQueryOptions<
  T,
  TData = InfiniteData<CursorPage<T>, string | undefined>,
>(options: CursorQueryOptions<T, TData>) {
  return infiniteQueryOptions<
    CursorPage<T>,
    Error,
    TData,
    QueryKey,
    string | undefined
  >({
    ...options,
    initialPageParam: undefined,
    getNextPageParam: getNextPageCursor<T>,
  })
}

export function useCursorInfiniteQuery<
  T,
  TData = InfiniteData<CursorPage<T>, string | undefined>,
>(options: CursorQueryOptions<T, TData>) {
  return useInfiniteQuery(cursorInfiniteQueryOptions(options))
}
