import { authTokenConstraints } from "@workspace/contracts/auth/constraints"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components"
import { render, toPlainText } from "@react-email/render"
import {
  email_verify_subject,
  email_verify_body,
  email_verify_action,
  email_reset_subject,
  email_reset_body,
  email_reset_action,
  email_expiry,
  email_fallback,
} from "@workspace/i18n/messages"
import type { Locale } from "@workspace/i18n/runtime"
import type { EmailMessage } from "@workspace/core/email"

export interface AuthEmailInput {
  kind: "verification" | "reset"
  to: string
  url: string
  locale: Locale
}

export async function renderAuthEmail(
  input: AuthEmailInput
): Promise<EmailMessage> {
  const locale = { locale: input.locale }
  let subject = email_verify_subject({}, locale)
  let body = email_verify_body({}, locale)
  let action = email_verify_action({}, locale)
  let hours = authTokenConstraints.emailVerificationExpiresInHours
  if (input.kind === "reset") {
    subject = email_reset_subject({}, locale)
    body = email_reset_body({}, locale)
    action = email_reset_action({}, locale)
    hours = authTokenConstraints.resetPasswordExpiresInHours
  }
  const html = await render(
    <Html lang={input.locale}>
      <Head />
      <Preview>{subject}</Preview>
      <Body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f6f6f6",
          color: "#18181b",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            margin: "32px auto",
            maxWidth: "480px",
          }}
        >
          <Heading>{subject}</Heading>
          <Text>{body}</Text>
          <Button
            href={input.url}
            style={{
              backgroundColor: "#18181b",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "6px",
            }}
          >
            {action}
          </Button>
          <Text>{email_expiry({ hours }, locale)}</Text>
          <Text>{email_fallback({}, locale)}</Text>
          <Text style={{ wordBreak: "break-all" }}>{input.url}</Text>
        </Container>
      </Body>
    </Html>
  )
  return { to: input.to, subject, html, text: toPlainText(html) }
}
