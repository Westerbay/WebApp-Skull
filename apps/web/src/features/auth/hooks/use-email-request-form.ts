import type { EmailFormValues } from "../schemas/auth-form.types"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { network_error } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { emailSchema } from "../schemas/auth-form"
import { authErrorMessage } from "../auth-error"

const EMAIL_REQUEST_DEFAULT_VALUES: EmailFormValues = { email: "" }

export function useEmailRequestForm(kind: "verification" | "reset") {
  const [serverError, setServerError] = useState<string>()
  const [received, setReceived] = useState(false)
  const requestEmail = async (value: EmailFormValues) => {
    if (kind === "verification") {
      return authClient.sendVerificationEmail({
        ...value,
        callbackURL: `${window.location.origin}/adresse-confirmee`,
      })
    }
    return authClient.requestPasswordReset({
      ...value,
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    })
  }

  const handleSubmit = async ({ value }: { value: EmailFormValues }) => {
    setServerError(undefined)
    setReceived(false)
    try {
      const result = await requestEmail(value)
      if (result.error) {
        setServerError(authErrorMessage(result.error))
        return
      }
      setReceived(true)
    } catch {
      setServerError(network_error())
    }
  }

  const form = useForm({
    defaultValues: EMAIL_REQUEST_DEFAULT_VALUES,
    validators: { onSubmit: emailSchema },
    onSubmit: handleSubmit,
  })
  return { form, serverError, received }
}
