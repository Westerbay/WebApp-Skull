import { QueryClient } from "@tanstack/react-query"
import { expect, it, vi } from "vitest"
import { usersQueryOptions } from "@/features/users/hooks/use-users"
import { cursorInfiniteQueryOptions } from "@/lib/query/use-cursor-infinite-query"

const { getUsers } = vi.hoisted(() => ({ getUsers: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiClient: { GET: getUsers } }))

it("isolates searched pages from the unfiltered cache and forwards search with the cursor", async () => {
  const alice = {
    id: "alice",
    name: "Alice",
    email: "alice@example.test",
    emailVerified: true,
  }
  const bob = {
    id: "bob",
    name: "Bob",
    email: "bob@example.test",
    emailVerified: true,
  }
  getUsers
    .mockResolvedValueOnce({
      data: { items: [alice, bob], nextCursor: null },
      response: new Response(),
    })
    .mockResolvedValueOnce({
      data: { items: [alice], nextCursor: "alice" },
      response: new Response(),
    })
    .mockResolvedValueOnce({
      data: { items: [], nextCursor: null },
      response: new Response(),
    })
  const client = new QueryClient()
  try {
    const unfiltered = cursorInfiniteQueryOptions(usersQueryOptions(20))
    const searched = cursorInfiniteQueryOptions(usersQueryOptions(20, "Alice"))
    await client.fetchInfiniteQuery(unfiltered)
    const result = await client.fetchInfiniteQuery({ ...searched, pages: 2 })
    expect(result.pages).toEqual([
      { items: [alice], nextCursor: "alice" },
      { items: [], nextCursor: null },
    ])
    expect(client.getQueryData(unfiltered.queryKey)?.pages[0]?.items).toEqual([
      alice,
      bob,
    ])
    expect(getUsers).toHaveBeenLastCalledWith("/api/users", {
      params: { query: { limit: 20, search: "Alice", cursor: "alice" } },
      signal: expect.any(AbortSignal),
    })
  } finally {
    client.clear()
    getUsers.mockReset()
  }
})
