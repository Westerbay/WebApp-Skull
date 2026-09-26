import { expect, it } from "vitest"
import {
  signUpSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas/auth-form"
import { getPasswordStrength } from "@/features/auth/password-strength"
import {
  password_min_length,
  password_max_length,
} from "@workspace/i18n/messages"

it("distinguishes minimum and maximum errors without trimming passwords", () => {
  const parse = (password: string) =>
    signUpSchema.safeParse({
      name: "Test",
      email: "test@example.test",
      password,
    })
  for (const length of [8, 128])
    expect(parse(" ".repeat(length)).success).toBe(true)
  const short = parse("a".repeat(7))
  const long = parse("a".repeat(129))
  if (short.success || long.success) throw new Error("Expected invalid lengths")
  expect(short.error.issues[0]?.message).toBe(password_min_length({ min: 8 }))
  expect(long.error.issues[0]?.message).toBe(password_max_length({ max: 128 }))
})

it("keeps weak passwords admissible and checks reset confirmation", () => {
  expect(
    resetPasswordSchema.safeParse({
      password: "password",
      confirmPassword: "password",
    }).success
  ).toBe(true)
  expect(
    resetPasswordSchema.safeParse({
      password: "password",
      confirmPassword: "different",
    }).success
  ).toBe(false)
})

it("recognizes common passwords and ranks a varied passphrase higher", () => {
  expect(getPasswordStrength("password")).toBe(0)
  expect(getPasswordStrength("motdepasse")).toBeLessThan(2)
  expect(getPasswordStrength("Érable!47-lune?Horizon-9")).toBeGreaterThan(
    getPasswordStrength("password")
  )
})
