import { onlineManager, QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  emailRequestMutationOptions,
  resetPasswordMutationOptions,
  signInMutationOptions,
  signOutMutationOptions,
  signUpMutationOptions,
} from "@/features/auth/mutations/auth.mutations"

const auth = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}))
vi.mock("@/lib/auth/auth-client", () => ({ authClient: auth }))
vi.mock("@workspace/i18n/routing", () => ({
  getLocalizedCallbackUrl: (path: string, origin: string) =>
    `${origin}/fr${path}`,
}))

const credentials = { email: "user@example.test", password: "test-password" }
const privateKey = ["private", "users"]
const publicKey = ["public", "project"]
let client: QueryClient

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } })
  client.setQueryData(privateKey, ["previous-user"])
  client.setQueryData(publicKey, "public-data")
  vi.stubGlobal("window", { location: { origin: "https://app.example.test" } })
})

afterEach(() => {
  client.clear()
  onlineManager.setOnline(true)
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

const identityWrites = [
  {
    name: "sign in",
    request: auth.signIn.email,
    execute: (queryClient: QueryClient) =>
      queryClient
        .getMutationCache()
        .build(queryClient, signInMutationOptions(queryClient))
        .execute(credentials),
  },
  {
    name: "sign up",
    request: auth.signUp.email,
    execute: (queryClient: QueryClient) =>
      queryClient
        .getMutationCache()
        .build(queryClient, signUpMutationOptions(queryClient))
        .execute({ ...credentials, name: "Test user" }),
  },
  {
    name: "sign out",
    request: auth.signOut,
    execute: (queryClient: QueryClient) =>
      queryClient
        .getMutationCache()
        .build(queryClient, signOutMutationOptions(queryClient))
        .execute(undefined),
  },
  {
    name: "reset password",
    request: auth.resetPassword,
    execute: (queryClient: QueryClient) =>
      queryClient
        .getMutationCache()
        .build(queryClient, resetPasswordMutationOptions(queryClient))
        .execute({ token: "test-token", newPassword: "test-password" }),
  },
]

describe.each(identityWrites)("$name mutation", ({ request, execute }) => {
  it("clears private cache before resolving success and preserves public data", async () => {
    const result = { data: {}, error: null }
    request.mockResolvedValue(result)
    await expect(execute(client)).resolves.toBe(result)
    expect(client.getQueryData(privateKey)).toBeUndefined()
    expect(client.getQueryData(publicKey)).toBe("public-data")
  })

  it("preserves provider errors and existing cache on rejection", async () => {
    const result = { data: null, error: { code: "INVALID_TOKEN", status: 400 } }
    request.mockResolvedValue(result)
    await expect(execute(client)).resolves.toBe(result)
    expect(client.getQueryData(privateKey)).toEqual(["previous-user"])
  })

  it("propagates network failures without retrying an identity write", async () => {
    onlineManager.setOnline(false)
    const error = new Error("Network unavailable")
    request.mockRejectedValue(error)
    await expect(execute(client)).rejects.toBe(error)
    expect(request).toHaveBeenCalledOnce()
    expect(client.getQueryData(privateKey)).toEqual(["previous-user"])
  })
})

it("passes the localized verification callback to signup", async () => {
  auth.signUp.email.mockResolvedValue({ data: {}, error: null })
  await client
    .getMutationCache()
    .build(client, signUpMutationOptions(client))
    .execute({ ...credentials, name: "Test user" })
  expect(auth.signUp.email).toHaveBeenCalledWith({
    ...credentials,
    name: "Test user",
    callbackURL: "https://app.example.test/fr/email-verified",
  })
})

it("cancels an in-flight private read before a successful sign-in resolves", async () => {
  const aborted = vi.fn()
  const pending = client.fetchQuery({
    queryKey: ["private", "in-flight"],
    queryFn: ({ signal }) =>
      new Promise<string>((resolve) => {
        signal.addEventListener("abort", () => {
          aborted()
          resolve("cancelled")
        })
      }),
  })
  const outcome = pending.catch(() => undefined)
  auth.signIn.email.mockResolvedValue({ data: {}, error: null })

  await client
    .getMutationCache()
    .build(client, signInMutationOptions(client))
    .execute(credentials)

  expect(aborted).toHaveBeenCalledOnce()
  expect(client.getQueryState(["private", "in-flight"])).toBeUndefined()
  await outcome
})

it.each([
  {
    kind: "verification",
    request: auth.sendVerificationEmail,
    callback: "callbackURL",
    path: "/email-verified",
  },
  {
    kind: "reset",
    request: auth.requestPasswordReset,
    callback: "redirectTo",
    path: "/reset-password",
  },
] as const)(
  "requests $kind email without clearing identity cache",
  async ({ kind, request, callback, path }) => {
    request.mockResolvedValue({ data: {}, error: null })
    await client
      .getMutationCache()
      .build(client, emailRequestMutationOptions(kind))
      .execute({ email: credentials.email })
    expect(request).toHaveBeenCalledWith({
      email: credentials.email,
      [callback]: `https://app.example.test/fr${path}`,
    })
    expect(client.getQueryData(privateKey)).toEqual(["previous-user"])
  }
)
