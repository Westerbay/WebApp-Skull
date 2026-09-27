import type {
  ChangeEventHandler,
  FocusEventHandler,
  HTMLInputTypeAttribute,
} from "react"

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
  label: string
  type?: HTMLInputTypeAttribute
  autoComplete: string
  showStrength?: boolean
}
