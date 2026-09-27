import { z } from "zod"
import {
  invalid_email,
  password_min_length,
  password_max_length,
  name_length,
  password_mismatch,
} from "@workspace/i18n/messages"
import { authPasswordConstraints } from "@workspace/contracts/auth/constraints"
import { authFormConstraints } from "./auth-form.constraints"

export const emailSchema = z.object({ email: z.email(invalid_email()) })
const password = z
  .string()
  .min(
    authPasswordConstraints.minLength,
    password_min_length({ min: authPasswordConstraints.minLength })
  )
  .max(
    authPasswordConstraints.maxLength,
    password_max_length({ max: authPasswordConstraints.maxLength })
  )
export const signInSchema = emailSchema.extend({ password })
export const signUpSchema = signInSchema.extend({
  name: z
    .string()
    .trim()
    .min(
      authFormConstraints.userNameMinLength,
      name_length({ min: authFormConstraints.userNameMinLength })
    ),
})
export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: password_mismatch(),
  })

export type EmailFormValues = z.input<typeof emailSchema>
export type SignInFormValues = z.input<typeof signInSchema>
export type SignUpFormValues = z.input<typeof signUpSchema>
export type ResetPasswordFormValues = z.input<typeof resetPasswordSchema>
