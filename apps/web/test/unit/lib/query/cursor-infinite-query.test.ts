import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query"
import { expect, it, vi } from "vitest"
import { cursorInfiniteQueryOptions } from "@/lib/query/use-cursor-infinite-query"
import { clearPrivateCache } from "@/lib/auth/current-user"

it("follows cursors, stops at null and clears cached pages on identity transition", async () => {
  const client = new QueryClient()
  const queryFn = vi.fn(
    async ({ pageParam }: { pageParam: string | undefined }) =>
      pageParam === undefined
        ? { items: ["first"], nextCursor: "first" }
        : { items: ["last"], nextCursor: null }
  )
  const options = cursorInfiniteQueryOptions({
    queryKey: ["private", "pagination"],
    queryFn,
  })
  const observer = new InfiniteQueryObserver(client, options)
  const first = await observer.fetchNextPage()
  expect(first.hasNextPage).toBe(true)
  expect(first.data?.pageParams).toEqual([undefined])
  const last = await observer.fetchNextPage()
  expect(last.hasNextPage).toBe(false)
  expect(last.data?.pages.map((page) => page.items)).toEqual([
    ["first"],
    ["last"],
  ])
  expect(last.data?.pageParams).toEqual([undefined, "first"])
  await observer.fetchNextPage()
  expect(queryFn).toHaveBeenCalledTimes(2)
  await clearPrivateCache(client)
  expect(client.getQueryData(options.queryKey)).toBeUndefined()
  observer.destroy()
  client.clear()
})

it("preserves successful pages when loading the next page fails and allows retry", async () => {
  const client = new QueryClient()
  const queryFn = vi
    .fn()
    .mockResolvedValueOnce({ items: ["first"], nextCursor: "first" })
    .mockRejectedValueOnce(new Error("unavailable"))
    .mockResolvedValueOnce({ items: ["last"], nextCursor: null })
  const observer = new InfiniteQueryObserver(
    client,
    cursorInfiniteQueryOptions<string>({
      queryKey: ["private", "pagination"],
      queryFn,
      retry: false,
    })
  )
  await observer.fetchNextPage()
  const failed = await observer.fetchNextPage()
  expect(failed.isFetchNextPageError).toBe(true)
  expect(failed.data?.pages).toHaveLength(1)
  const retried = await observer.fetchNextPage()
  expect(retried.data?.pages).toHaveLength(2)
  expect(retried.isError).toBe(false)
  observer.destroy()
  client.clear()
})
