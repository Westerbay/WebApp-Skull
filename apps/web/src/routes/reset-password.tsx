import { createFileRoute, Link } from "@tanstack/react-router"
import {
  reset_title,
  reset_description,
  invalid_link,
  send_reset,
  back_sign_in,
} from "@workspace/i18n/messages"
import { AuthPanel } from "@/features/auth/components/auth-panel"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"
import { privateHead } from "@/lib/seo/private-head"
import { tokenSearchSchema } from "@/features/auth/schemas/search"

export const Route = createFileRoute("/reset-password")({
  validateSearch: tokenSearchSchema,
  head: () => privateHead(reset_title(), reset_description()),
  component: Page,
})
function Page() {
  const { token, error } = Route.useSearch()
  return (
    <AuthPanel title={reset_title()} description={reset_description()}>
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p role="alert">{invalid_link()}</p>
      )}
      <nav className="flex flex-col gap-3 text-sm underline underline-offset-4">
        <Link to="/forgot-password">{send_reset()}</Link>
        <Link to="/sign-in">{back_sign_in()}</Link>
      </nav>
    </AuthPanel>
  )
}
