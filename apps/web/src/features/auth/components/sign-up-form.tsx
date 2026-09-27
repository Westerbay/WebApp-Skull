import { useHydrated } from "@tanstack/react-router"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import {
  name_label,
  email_label,
  password_label,
  sign_up,
} from "@workspace/i18n/messages"
import type { FormEvent } from "react"
import { useSignUpForm } from "../hooks/use-sign-up-form"
import { AuthInput } from "./auth-input"

export function SignUpForm() {
  const hydrated = useHydrated()
  const { form, serverError } = useSignUpForm()
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit()
  }
  const renderNameField = () => (
    <AuthInput label={name_label()} type="text" autoComplete="name" />
  )
  const renderEmailField = () => (
    <AuthInput label={email_label()} type="email" autoComplete="email" />
  )
  const renderPasswordField = () => (
    <AuthInput
      label={password_label()}
      showStrength
      type="password"
      autoComplete="new-password"
    />
  )
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.AppField name="name">{renderNameField}</form.AppField>
          <form.AppField name="email">{renderEmailField}</form.AppField>
          <form.AppField name="password">{renderPasswordField}</form.AppField>
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          <form.AppForm>
            <form.AuthSubmitButton label={sign_up()} />
          </form.AppForm>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
