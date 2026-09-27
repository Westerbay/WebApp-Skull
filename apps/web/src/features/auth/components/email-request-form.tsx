import { useHydrated } from "@tanstack/react-router"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import {
  email_label,
  resend_verification,
  send_reset,
  email_request_received,
} from "@workspace/i18n/messages"
import type { FormEvent } from "react"
import { useEmailRequestForm } from "../hooks/use-email-request-form"
import { AuthInput } from "./auth-input"

export function EmailRequestForm({ kind }: { kind: "verification" | "reset" }) {
  const hydrated = useHydrated()
  const { form, serverError, received } = useEmailRequestForm(kind)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit()
  }
  const action = kind === "verification" ? resend_verification() : send_reset()
  const renderEmailField = () => (
    <AuthInput label={email_label()} type="email" autoComplete="email" />
  )
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.AppField name="email">{renderEmailField}</form.AppField>
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          {received && (
            <p role="status" className="text-sm text-muted-foreground">
              {email_request_received()}
            </p>
          )}
          <form.AppForm>
            <form.AuthSubmitButton label={action} />
          </form.AppForm>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
