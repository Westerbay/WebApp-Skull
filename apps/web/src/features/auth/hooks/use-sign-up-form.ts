import type { SignUpFormValues } from "../schemas/auth-form"
import { useAuthForm } from "./use-auth-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { useMutation } from "@tanstack/react-query"
import { signUpMutationOptions } from "../mutations/auth.mutations"
import { signUpSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const SIGN_UP_DEFAULT_VALUES: SignUpFormValues = {
  name: "",
  email: "",
  password: "",
}

export function useSignUpForm() {
  const router = useRouter()
  const mutation = useMutation(
    signUpMutationOptions(router.options.context.queryClient)
  )
  const [serverError, setServerError] = useState<string>()
  const handleSubmit = async ({ value }: { value: SignUpFormValues }) => {
    setServerError(undefined)
    try {
      const result = await mutation.mutateAsync(value)
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      await router.navigate({ to: "/verify-email" })
      await router.invalidate()
    } catch {
      setServerError(network_error())
    }
  }

  const form = useAuthForm({
    defaultValues: SIGN_UP_DEFAULT_VALUES,
    validators: { onSubmit: signUpSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
