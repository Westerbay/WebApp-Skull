export const authPasswordConstraints = {
  minLength: 8,
  maxLength: 128,
}

export const authTokenConstraints = {
  emailVerificationExpiresInHours: 24,
  resetPasswordExpiresInHours: 1,
}
