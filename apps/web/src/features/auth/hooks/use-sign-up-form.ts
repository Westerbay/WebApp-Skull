import { getLocalizedCallbackUrl } from "@workspace/i18n/routing"
import type { SignUpFormValues } from "../schemas/auth-form.types"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { clearPrivateCache } from "@/lib/auth/current-user"
import { signUpSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const SIGN_UP_DEFAULT_VALUES: SignUpFormValues = {
  name: "",
  email: "",
  password: "",
}

export function useSignUpForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string>()
  const handleSubmit = async ({ value }: { value: SignUpFormValues }) => {
    setServerError(undefined)
    try {
      const result = await authClient.signUp.email({
        ...value,
        callbackURL: getLocalizedCallbackUrl(
          "/email-verified",
          window.location.origin
        ),
      })
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      await clearPrivateCache(router.options.context.queryClient)
      await router.navigate({ to: "/verify-email" })
      await router.invalidate()
    } catch {
      setServerError(network_error())
    }
  }

  const form = useForm({
    defaultValues: SIGN_UP_DEFAULT_VALUES,
    validators: { onSubmit: signUpSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
