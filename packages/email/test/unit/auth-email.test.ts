import { expect, it } from "vitest"
import { renderAuthEmail } from "../../src/auth-email.js"
import { email_expiry } from "@workspace/i18n/messages"
import { createSmtpSender } from "../../src/sender.js"
import { getEmailConfig } from "../../src/config.js"

it("renders French HTML and plain text with the same supplied action and expiry", async () => {
  const email = await renderAuthEmail({
    kind: "reset",
    locale: "fr",
    to: "person@example.test",
    url: "https://app.example.test/nouveau-mot-de-passe?token=fake",
  })
  expect(email.html).toContain('lang="fr"')
  expect(email.html).toContain(
    'href="https://app.example.test/nouveau-mot-de-passe?token=fake"'
  )
  expect(email.text).toContain("Ce lien expire dans 1 heure.")
  expect(email.text).toContain(
    "https://app.example.test/nouveau-mot-de-passe?token=fake"
  )
  expect(email_expiry({ hours: 0 }, { locale: "fr" })).toBe(
    "Ce lien expire dans 0 heure."
  )
  expect(email_expiry({ hours: 2 }, { locale: "fr" })).toBe(
    "Ce lien expire dans 2 heures."
  )
})

it("refuses an unlisted staging recipient before opening SMTP", async () => {
  const sender = createSmtpSender(
    getEmailConfig({
      APP_ENV: "staging",
      EMAIL_MODE: "smtp",
      EMAIL_ALLOWED_RECIPIENTS: "allowed@example.test",
      SMTP_HOST: "unreachable.invalid",
    })
  )
  await expect(
    sender.send({
      to: "other@example.test",
      subject: "test",
      html: "test",
      text: "test",
    })
  ).rejects.toThrow("EMAIL_RECIPIENT_NOT_ALLOWED")
})

it("announces the verification expiry in both email formats", async () => {
  const email = await renderAuthEmail({
    kind: "verification",
    locale: "fr",
    to: "person@example.test",
    url: "https://app.example.test/adresse-confirmee?token=fake",
  })
  expect(email.html).toContain("Ce lien expire dans 24 heures.")
  expect(email.text).toContain("Ce lien expire dans 24 heures.")
})
