import type { SignInFormValues } from "../schemas/auth-form"
import { useAuthForm } from "./use-auth-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { useMutation } from "@tanstack/react-query"
import { signInMutationOptions } from "../mutations/auth.mutations"
import { signInSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const SIGN_IN_DEFAULT_VALUES: SignInFormValues = { email: "", password: "" }

export function useSignInForm(redirect: string) {
  const router = useRouter()
  const mutation = useMutation(
    signInMutationOptions(router.options.context.queryClient)
  )
  const [serverError, setServerError] = useState<string>()
  const handleSubmit = async ({ value }: { value: SignInFormValues }) => {
    setServerError(undefined)
    try {
      const result = await mutation.mutateAsync(value)
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      await router.navigate({ href: redirect })
      await router.invalidate()
    } catch {
      setServerError(network_error())
    }
  }

  const form = useAuthForm({
    defaultValues: SIGN_IN_DEFAULT_VALUES,
    validators: { onSubmit: signInSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
