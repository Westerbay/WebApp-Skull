import type {
  ChangeEventHandler,
  FocusEventHandler,
  HTMLInputTypeAttribute,
} from "react"

export interface AuthFieldError {
  message?: string
}

export interface AuthTextInputProps {
  id: string
  name: string
  autoComplete: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  onBlur: FocusEventHandler<HTMLInputElement>
  "aria-invalid": boolean
  "aria-describedby"?: string
  className?: string
  disabled?: boolean
}

export interface AuthInputProps {
  name: string
  label: string
  type?: HTMLInputTypeAttribute
  autoComplete: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  errors: Array<AuthFieldError | undefined>
  showStrength?: boolean
}
