import { createFileRoute, Link } from "@tanstack/react-router"
import {
  verification_complete,
  verification_complete_description,
  invalid_link,
  back_sign_in,
  resend_verification,
} from "@workspace/i18n/messages"
import { AuthPanel } from "@/features/auth/components/auth-panel"
import { tokenSearchSchema } from "@/features/auth/schemas/search"
import { privateHead } from "@/lib/seo/private-head"

export const Route = createFileRoute("/email-verified")({
  validateSearch: tokenSearchSchema,
  head: () =>
    privateHead(verification_complete(), verification_complete_description()),
  component: Page,
})
function Page() {
  const { error } = Route.useSearch()
  const title = error ? invalid_link() : verification_complete()
  const description = error
    ? resend_verification()
    : verification_complete_description()
  return (
    <AuthPanel title={title} description={description}>
      <nav className="flex flex-col gap-3 text-sm underline underline-offset-4">
        <Link to="/sign-in">{back_sign_in()}</Link>
        <Link to="/verify-email">{resend_verification()}</Link>
      </nav>
    </AuthPanel>
  )
}
