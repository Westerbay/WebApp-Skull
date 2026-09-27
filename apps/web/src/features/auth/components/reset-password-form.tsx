import { useHydrated } from "@tanstack/react-router"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import {
  new_password_label,
  confirm_password_label,
  reset_submit,
} from "@workspace/i18n/messages"
import type { FormEvent } from "react"
import { useResetPasswordForm } from "../hooks/use-reset-password-form"
import { AuthInput } from "./auth-input"

export function ResetPasswordForm({ token }: { token: string }) {
  const hydrated = useHydrated()
  const { form, serverError } = useResetPasswordForm(token)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit()
  }
  const renderPasswordField = () => (
    <AuthInput
      label={new_password_label()}
      showStrength
      type="password"
      autoComplete="new-password"
    />
  )
  const renderConfirmPasswordField = () => (
    <AuthInput
      label={confirm_password_label()}
      type="password"
      autoComplete="new-password"
    />
  )
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.AppField name="password">{renderPasswordField}</form.AppField>
          <form.AppField name="confirmPassword">
            {renderConfirmPasswordField}
          </form.AppField>
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          <form.AppForm>
            <form.AuthSubmitButton label={reset_submit()} />
          </form.AppForm>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
