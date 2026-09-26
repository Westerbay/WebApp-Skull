import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import {
  password_show,
  password_hide,
  password_min_length,
  password_max_length,
} from "@workspace/i18n/messages"
import { authPasswordConstraints } from "@workspace/contracts/auth/constraints"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import type { ChangeEvent } from "react"
import { PasswordStrength } from "./password-strength"

interface AuthInputProps {
  name: string
  label: string
  type?: string
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
  const [visible, setVisible] = useState(false)
  const isPassword = type === "password"
  const tooLong = isPassword && value.length > authPasswordConstraints.maxLength
  const invalid = errors.length > 0 || tooLong
  const errorId = `${name}-error`
  const helpId = `${name}-help`
  const strengthId = `${name}-strength`
  const describedBy =
    [
      showStrength ? helpId : undefined,
      showStrength && value && !tooLong ? strengthId : undefined,
      invalid ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={isPassword && visible ? "text" : type}
          autoComplete={autoComplete}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={isPassword ? "min-h-11 pr-12" : "min-h-11"}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-11"
            aria-label={visible ? password_hide() : password_show()}
            aria-controls={name}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {showStrength && (
        <FieldDescription id={helpId}>
          {password_min_length({ min: authPasswordConstraints.minLength })}
        </FieldDescription>
      )}
      {showStrength && value && !tooLong && (
        <PasswordStrength id={strengthId} password={value} />
      )}
      <FieldError
        id={errorId}
        errors={
          tooLong
            ? [
                {
                  message: password_max_length({
                    max: authPasswordConstraints.maxLength,
                  }),
                },
              ]
            : errors
        }
      />
    </Field>
  )
}
