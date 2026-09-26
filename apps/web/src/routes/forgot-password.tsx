import { createFileRoute, Link } from "@tanstack/react-router"
import {
  forgot_title,
  forgot_description,
  back_sign_in,
} from "@workspace/i18n/messages"
import { AuthPanel } from "@/features/auth/components/auth-panel"
import { EmailRequestForm } from "@/features/auth/components/email-request-form"
import { privateHead } from "@/lib/seo/private-head"

export const Route = createFileRoute("/forgot-password")({
  head: () => privateHead(forgot_title(), forgot_description()),
  component: Page,
})
function Page() {
  return (
    <AuthPanel title={forgot_title()} description={forgot_description()}>
      <EmailRequestForm kind="reset" />
      <nav className="flex flex-col gap-3 text-sm underline underline-offset-4">
        <Link to="/sign-in">{back_sign_in()}</Link>
      </nav>
    </AuthPanel>
  )
}
