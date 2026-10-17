import { QueryClient } from "@tanstack/react-query"
import { httpStatus } from "@/lib/api/http-status"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AuthenticationRequiredError,
  currentUserQueryOptions,
  loadCurrentUserForProtectedRoute,
} from "@/features/auth/queries/current-user.queries"

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: getCurrentUser },
}))

afterEach(() => {
  getCurrentUser.mockReset()
})

describe("identity transitions", () => {
  it("checks a fresh cached identity with the API before entering a protected route", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryOptions.queryKey, {
      id: "revoked-user",
      name: "Revoked user",
      email: "revoked@example.test",
      emailVerified: true,
    })
    getCurrentUser.mockResolvedValue({
      response: new Response(null, { status: httpStatus.unauthorized }),
    })

    await expect(
      loadCurrentUserForProtectedRoute(queryClient)
    ).rejects.toBeInstanceOf(AuthenticationRequiredError)

    expect(getCurrentUser).toHaveBeenCalledOnce()
  })
})
