import { useHydrated } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { FieldError, FieldGroup } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
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
  return (
    <form method="post" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <form.Field name="name">
            {(field) => (
              <AuthInput
                name={field.name}
                label={name_label()}
                type="text"
                autoComplete="name"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <AuthInput
                name={field.name}
                label={email_label()}
                type="email"
                autoComplete="email"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <AuthInput
                name={field.name}
                label={password_label()}
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
          {serverError && <FieldError role="alert">{serverError}</FieldError>}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <Button type="submit" disabled={pending} className="min-h-11">
                {pending && <Spinner />}
                {sign_up()}
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
