import type { EmailFormValues } from "../schemas/auth-form"
import { useAuthForm } from "./use-auth-form"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { useMutation } from "@tanstack/react-query"
import { emailRequestMutationOptions } from "../mutations/auth.mutations"
import { emailSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const EMAIL_REQUEST_DEFAULT_VALUES: EmailFormValues = { email: "" }

export function useEmailRequestForm(kind: "verification" | "reset") {
  const [serverError, setServerError] = useState<string>()
  const [received, setReceived] = useState(false)
  const mutation = useMutation(emailRequestMutationOptions(kind))

  const handleSubmit = async ({ value }: { value: EmailFormValues }) => {
    setServerError(undefined)
    setReceived(false)
    try {
      const result = await mutation.mutateAsync(value)
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      setReceived(true)
    } catch {
      setServerError(network_error())
    }
  }

  const form = useAuthForm({
    defaultValues: EMAIL_REQUEST_DEFAULT_VALUES,
    validators: { onSubmit: emailSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError, received }
}
