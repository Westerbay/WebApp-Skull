import { useHydrated } from "@tanstack/react-router"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import { email_label, password_label, sign_in } from "@workspace/i18n/messages"
import type { FormEvent } from "react"
import { useSignInForm } from "../hooks/use-sign-in-form"
import { AuthInput } from "./auth-input"

export function SignInForm({ redirect }: { redirect: string }) {
  const hydrated = useHydrated()
  const { form, serverError } = useSignInForm(redirect)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit()
  }
  const renderEmailField = () => (
    <AuthInput label={email_label()} type="email" autoComplete="email" />
  )
  const renderPasswordField = () => (
    <AuthInput
      label={password_label()}
      type="password"
      autoComplete="current-password"
    />
  )
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.AppField name="email">{renderEmailField}</form.AppField>
          <form.AppField name="password">{renderPasswordField}</form.AppField>
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          <form.AppForm>
            <form.AuthSubmitButton label={sign_in()} />
          </form.AppForm>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
