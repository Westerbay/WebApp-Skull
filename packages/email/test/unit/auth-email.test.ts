import { DEFAULT_LOCALE } from "@workspace/i18n/config"
import { expect, it } from "vitest"
import { renderAuthEmail } from "../../src/auth-email.js"
import { email_expiry } from "@workspace/i18n/messages"
import { createSmtpSender } from "../../src/sender.js"
import { getEmailConfig } from "../../src/config.js"

it("renders localized HTML and plain text with the same supplied action and expiry", async () => {
  const email = await renderAuthEmail({
    kind: "reset",
    locale: DEFAULT_LOCALE,
    to: "person@example.test",
    url: "https://app.example.test/nouveau-mot-de-passe?token=fake",
  })
  expect(email.html).toContain(`lang="${DEFAULT_LOCALE}"`)
  expect(email.html).toContain(
    'href="https://app.example.test/nouveau-mot-de-passe?token=fake"'
  )
  expect(email.text).toContain(email_expiry({ hours: 1 }))
  expect(email.text).toContain(
    "https://app.example.test/nouveau-mot-de-passe?token=fake"
  )
  const pluralExamples = new Map([
    ["en", ["This link expires in 0 hours.", "This link expires in 2 hours."]],
    ["fr", ["Ce lien expire dans 0 heure.", "Ce lien expire dans 2 heures."]],
  ])
  const expected = pluralExamples.get(DEFAULT_LOCALE)
  if (!expected) throw new Error("Missing plural expectations")
  expect(email_expiry({ hours: 0 })).toBe(expected[0])
  expect(email_expiry({ hours: 2 })).toBe(expected[1])
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
    locale: DEFAULT_LOCALE,
    to: "person@example.test",
    url: "https://app.example.test/adresse-confirmee?token=fake",
  })
  expect(email.html).toContain(email_expiry({ hours: 24 }))
  expect(email.text).toContain(email_expiry({ hours: 24 }))
})
