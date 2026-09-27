import { useId } from "react"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  password_min_length,
  password_max_length,
} from "@workspace/i18n/messages"
import { authPasswordConstraints } from "@workspace/contracts/auth/constraints"
import type { ChangeEvent } from "react"
import { PasswordStrength } from "./password-strength"
import { PasswordInput } from "./password-input"

import type { AuthInputProps } from "./auth-input.types"
import { useFieldContext } from "../form-context"

export function AuthInput({
  label,
  type = "text",
  autoComplete,
  showStrength = false,
}: AuthInputProps) {
  const field = useFieldContext<string>()
  const value = field.state.value
  const inputId = useId()
  const isPassword = type === "password"
  const tooLong = isPassword && value.length > authPasswordConstraints.maxLength
  let fieldErrors = field.state.meta.errors
  if (tooLong) {
    fieldErrors = [
      {
        message: password_max_length({
          max: authPasswordConstraints.maxLength,
        }),
      },
    ]
  }
  const invalid = fieldErrors.some((error) => Boolean(error?.message))
  const errorId = `${inputId}-error`
  const helpId = `${inputId}-help`
  const strengthId = `${inputId}-strength`
  const showPasswordHelp = isPassword && showStrength
  const showPasswordStrength = showPasswordHelp && value.length > 0 && !tooLong
  const descriptionIds: Array<string> = []
  if (showPasswordHelp) descriptionIds.push(helpId)
  if (showPasswordStrength) descriptionIds.push(strengthId)
  if (invalid) descriptionIds.push(errorId)
  const describedBy = descriptionIds.join(" ") || undefined

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    field.handleChange(event.target.value)
  }

  const inputProps = {
    id: inputId,
    name: field.name,
    autoComplete,
    value,
    onChange: handleChange,
    onBlur: field.handleBlur,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  }

  let input = <Input {...inputProps} type={type} className="min-h-11" />
  if (isPassword) input = <PasswordInput {...inputProps} />

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {input}
      {showPasswordHelp && (
        <FieldDescription id={helpId}>
          {password_min_length({ min: authPasswordConstraints.minLength })}
        </FieldDescription>
      )}
      {showPasswordStrength && (
        <PasswordStrength id={strengthId} password={value} />
      )}
      <FieldError id={errorId} errors={fieldErrors} />
    </Field>
  )
}
