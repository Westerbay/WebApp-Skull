import { QueryClient } from "@tanstack/react-query"
import { expect, it, vi } from "vitest"
import { clearPrivateCache } from "@/lib/query/private-cache"

it("cancels private requests and removes their data while preserving public queries", async () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(["private", "auth", "current-user"], {
    id: "user-a",
    name: "User A",
    email: "a@example.test",
    emailVerified: true,
  })
  queryClient.setQueryData(["private", "dashboard"], {
    ownerId: "user-a",
  })
  queryClient.setQueryData(["public", "project"], { name: "Public project" })
  const publicAborted = vi.fn()
  let finishPublicRequest: (value: string) => void = () => {
    throw new Error("Public request not started")
  }
  const publicRequest = queryClient.fetchQuery({
    queryKey: ["public", "in-flight"],
    queryFn: ({ signal }) =>
      new Promise<string>((resolve) => {
        finishPublicRequest = resolve
        signal.addEventListener("abort", () => publicAborted())
      }),
  })
  const publicOutcome = publicRequest.catch(() => undefined)
  const privateAborted = vi.fn()
  const pendingRequest = queryClient.fetchQuery({
    queryKey: ["private", "in-flight"],
    queryFn: ({ signal }) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => {
          privateAborted()
          resolve("cancelled")
        })
      }),
  })
  const pendingOutcome = pendingRequest.catch(() => undefined)

  await clearPrivateCache(queryClient)
  await pendingOutcome

  expect(privateAborted).toHaveBeenCalledOnce()
  expect(publicAborted).not.toHaveBeenCalled()
  expect(
    queryClient.getQueryData(["private", "auth", "current-user"])
  ).toBeUndefined()
  expect(queryClient.getQueryData(["private", "dashboard"])).toBeUndefined()
  expect(queryClient.getQueryState(["private", "in-flight"])).toBeUndefined()
  expect(queryClient.getQueryData(["public", "project"])).toEqual({
    name: "Public project",
  })
  finishPublicRequest("Public result")
  await expect(publicOutcome).resolves.toBe("Public result")
  expect(queryClient.getQueryData(["public", "in-flight"])).toBe(
    "Public result"
  )
})
