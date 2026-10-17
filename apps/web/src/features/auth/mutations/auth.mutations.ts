import { mutationOptions } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { getLocalizedCallbackUrl } from "@workspace/i18n/routing"
import { authClient } from "@/lib/auth/auth-client"
import { clearPrivateCache } from "@/lib/query/private-cache"
import type {
  SignInFormValues,
  SignUpFormValues,
  EmailFormValues,
} from "../schemas/auth-form"

// Execute auth writes immediately, without retries or retaining inactive credentials.
export function signInMutationOptions(queryClient: QueryClient) {
  const signIn = async (value: SignInFormValues) => {
    const result = await authClient.signIn.email(value)
    if (!result.error) await clearPrivateCache(queryClient)
    return result
  }
  return mutationOptions({
    mutationFn: signIn,
    retry: false,
    gcTime: 0,
    networkMode: "always",
  })
}

export function signUpMutationOptions(queryClient: QueryClient) {
  const signUp = async (value: SignUpFormValues) => {
    const result = await authClient.signUp.email({
      ...value,
      callbackURL: getLocalizedCallbackUrl(
        "/email-verified",
        window.location.origin
      ),
    })
    if (!result.error) await clearPrivateCache(queryClient)
    return result
  }
  return mutationOptions({
    mutationFn: signUp,
    retry: false,
    gcTime: 0,
    networkMode: "always",
  })
}

export function signOutMutationOptions(queryClient: QueryClient) {
  const signOut = async () => {
    const result = await authClient.signOut()
    if (!result.error) await clearPrivateCache(queryClient)
    return result
  }
  return mutationOptions({
    mutationFn: signOut,
    retry: false,
    gcTime: 0,
    networkMode: "always",
  })
}

export function resetPasswordMutationOptions(queryClient: QueryClient) {
  const resetPassword = async (value: {
    token: string
    newPassword: string
  }) => {
    const result = await authClient.resetPassword(value)
    if (!result.error) await clearPrivateCache(queryClient)
    return result
  }
  return mutationOptions({
    mutationFn: resetPassword,
    retry: false,
    gcTime: 0,
    networkMode: "always",
  })
}

export function emailRequestMutationOptions(kind: "verification" | "reset") {
  const requestEmail = async (value: EmailFormValues) => {
    if (kind === "verification") {
      return authClient.sendVerificationEmail({
        ...value,
        callbackURL: getLocalizedCallbackUrl(
          "/email-verified",
          window.location.origin
        ),
      })
    }
    return authClient.requestPasswordReset({
      ...value,
      redirectTo: getLocalizedCallbackUrl(
        "/reset-password",
        window.location.origin
      ),
    })
  }
  return mutationOptions({
    mutationFn: requestEmail,
    retry: false,
    gcTime: 0,
    networkMode: "always",
  })
}
