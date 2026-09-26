import { useHydrated } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
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
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.Field name="password">
            {(field) => (
              <AuthInput
                name={field.name}
                label={new_password_label()}
                showStrength
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => (
              <AuthInput
                name={field.name}
                label={confirm_password_label()}
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <Button type="submit" disabled={pending} className="min-h-11">
                {pending && <Spinner />}
                {reset_submit()}
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
