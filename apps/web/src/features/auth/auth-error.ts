import {
  invalid_credentials,
  email_not_verified,
  rate_limited,
  invalid_link,
  request_error,
  password_compromised,
  reset_password_compromised,
  reset_password_check_failed,
} from "@workspace/i18n/messages"

export function authErrorMessage(
  error: { code?: string; status?: number },
  operation?: "reset-password"
) {
  if (error.status === 429) return rate_limited()
  if (operation === "reset-password") {
    if (error.code === "PASSWORD_COMPROMISED")
      return reset_password_compromised()
    if (error.status && error.status >= 500)
      return reset_password_check_failed()
  }
  switch (error.code) {
    case "PASSWORD_COMPROMISED":
      return password_compromised()
    case "INVALID_EMAIL_OR_PASSWORD":
      return invalid_credentials()
    case "EMAIL_NOT_VERIFIED":
      return email_not_verified()
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return invalid_link()
    default:
      return request_error()
  }
}
