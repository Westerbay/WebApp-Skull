import { expect, it } from "vitest"
import { authErrorMessage } from "@/features/auth/auth-error"
import {
  password_compromised,
  request_error,
  reset_password_compromised,
  reset_password_check_failed,
} from "@workspace/i18n/messages"

it("explains compromised passwords and keeps provider outages generic", () => {
  expect(authErrorMessage({ code: "PASSWORD_COMPROMISED", status: 400 })).toBe(
    password_compromised()
  )
  expect(authErrorMessage({ status: 500 })).toBe(request_error())
})

it("asks for a fresh reset link after a password rejection or server failure", () => {
  expect(
    authErrorMessage(
      { code: "PASSWORD_COMPROMISED", status: 400 },
      "reset-password"
    )
  ).toBe(reset_password_compromised())
  expect(authErrorMessage({ status: 500 }, "reset-password")).toBe(
    reset_password_check_failed()
  )
})
