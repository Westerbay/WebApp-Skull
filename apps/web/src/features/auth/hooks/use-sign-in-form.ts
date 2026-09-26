import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { clearPrivateCache } from "@/lib/auth/current-user"
import { signInSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const SIGN_IN_DEFAULT_VALUES = { email: "", password: "" }

export function useSignInForm(redirect: string) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string>()
  async function handleSubmit({
    value,
  }: {
    value: typeof SIGN_IN_DEFAULT_VALUES
  }) {
    setServerError(undefined)
    try {
      const result = await authClient.signIn.email(value)
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      await clearPrivateCache(router.options.context.queryClient)
      await router.navigate({ href: redirect })
      await router.invalidate()
    } catch {
      setServerError(network_error())
    }
  }

  const form = useForm({
    defaultValues: SIGN_IN_DEFAULT_VALUES,
    validators: { onSubmit: signInSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
