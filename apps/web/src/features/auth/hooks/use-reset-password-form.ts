import type { ResetPasswordFormValues } from "../schemas/auth-form"
import { useAuthForm } from "./use-auth-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { network_error, reset_complete } from "@workspace/i18n/messages"
import { useMutation } from "@tanstack/react-query"
import { resetPasswordMutationOptions } from "../mutations/auth.mutations"
import { resetPasswordSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const RESET_PASSWORD_DEFAULT_VALUES: ResetPasswordFormValues = {
  password: "",
  confirmPassword: "",
}

export function useResetPasswordForm(token: string) {
  const router = useRouter()
  const mutation = useMutation(
    resetPasswordMutationOptions(router.options.context.queryClient)
  )
  const [serverError, setServerError] = useState<string>()
  const handleSubmit = async ({
    value,
  }: {
    value: ResetPasswordFormValues
  }) => {
    setServerError(undefined)
    try {
      const result = await mutation.mutateAsync({
        token,
        newPassword: value.password,
      })
      if (result.error) {
        setServerError(authErrorMessage(result.error, "reset-password"))
        return
      }
      await router.navigate({ to: "/sign-in", replace: true })
      toast.success(reset_complete())
    } catch {
      setServerError(network_error())
    }
  }

  const form = useAuthForm({
    defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
