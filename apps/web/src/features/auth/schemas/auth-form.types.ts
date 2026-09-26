export interface EmailFormValues {
  email: string
}

export interface SignInFormValues extends EmailFormValues {
  password: string
}

export interface SignUpFormValues extends SignInFormValues {
  name: string
}

export interface ResetPasswordFormValues {
  password: string
  confirmPassword: string
}
