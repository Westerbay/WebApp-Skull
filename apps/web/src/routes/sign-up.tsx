import { createFileRoute, Link } from "@tanstack/react-router"
import {
  sign_up_title,
  sign_up_description,
  back_sign_in,
} from "@workspace/i18n/messages"
import { AuthPanel } from "@/features/auth/components/auth-panel"
import { SignUpForm } from "@/features/auth/components/sign-up-form"
import { privateHead } from "@/lib/seo/private-head"

export const Route = createFileRoute("/sign-up")({
  head: () => privateHead(sign_up_title(), sign_up_description()),
  component: Page,
})
function Page() {
  return (
    <AuthPanel title={sign_up_title()} description={sign_up_description()}>
      <SignUpForm />
      <nav className="flex flex-col gap-3 text-sm underline underline-offset-4">
        <Link to="/sign-in">{back_sign_in()}</Link>
      </nav>
    </AuthPanel>
  )
}
