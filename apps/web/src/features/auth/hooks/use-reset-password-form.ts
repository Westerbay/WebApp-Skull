import type { ResetPasswordFormValues } from "../schemas/auth-form"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { network_error, reset_complete } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { clearPrivateCache } from "@/lib/auth/current-user"
import { resetPasswordSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const RESET_PASSWORD_DEFAULT_VALUES: ResetPasswordFormValues = {
  password: "",
  confirmPassword: "",
}

export function useResetPasswordForm(token: string) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string>()
  const handleSubmit = async ({
    value,
  }: {
    value: ResetPasswordFormValues
  }) => {
    setServerError(undefined)
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: value.password,
      })
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      await clearPrivateCache(router.options.context.queryClient)
      await router.navigate({ to: "/sign-in", replace: true })
      toast.success(reset_complete())
    } catch {
      setServerError(network_error())
    }
  }

  const form = useForm({
    defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError }
}
