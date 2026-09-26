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
import type { ChangeEvent, ComponentProps } from "react"
import { PasswordStrength } from "./password-strength"
import { PasswordInput } from "./password-input"

interface AuthInputProps {
  name: string
  label: string
  type?: ComponentProps<typeof Input>["type"]
  autoComplete: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  errors: Array<{ message?: string } | undefined>
  showStrength?: boolean
}

export function AuthInput({
  name,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  onBlur,
  errors,
  showStrength = false,
}: AuthInputProps) {
  const inputId = useId()
  const isPassword = type === "password"
  const tooLong = isPassword && value.length > authPasswordConstraints.maxLength
  const fieldErrors = tooLong
    ? [
        {
          message: password_max_length({
            max: authPasswordConstraints.maxLength,
          }),
        },
      ]
    : errors
  const invalid = fieldErrors.some((error) => Boolean(error?.message))
  const errorId = `${inputId}-error`
  const helpId = `${inputId}-help`
  const strengthId = `${inputId}-strength`
  const showPasswordHelp = isPassword && showStrength
  const showPasswordStrength = showPasswordHelp && value.length > 0 && !tooLong
  const describedBy =
    [
      showPasswordHelp ? helpId : undefined,
      showPasswordStrength ? strengthId : undefined,
      invalid ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  const inputProps = {
    id: inputId,
    name,
    autoComplete,
    value,
    onChange: handleChange,
    onBlur,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {isPassword ? (
        <PasswordInput {...inputProps} />
      ) : (
        <Input {...inputProps} type={type} className="min-h-11" />
      )}
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
