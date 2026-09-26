import { createFileRoute, redirect } from "@tanstack/react-router"
import { AccountHome } from "@/features/auth/components/account-home"
import { home_title, home_description } from "@workspace/i18n/messages"
import { privateHead } from "@/lib/seo/private-head"
import {
  AuthenticationRequiredError,
  loadCurrentUserForProtectedRoute,
} from "@/lib/auth/current-user"

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => privateHead(home_title(), home_description()),
  beforeLoad: async ({ context }) => {
    try {
      return {
        currentUser: await loadCurrentUserForProtectedRoute(
          context.queryClient
        ),
      }
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        throw redirect({ to: "/sign-in", search: { redirect: "/" } })
      }

      throw error
    }
  },
  component: HomePage,
})

function HomePage() {
  const { currentUser } = Route.useRouteContext()

  return <AccountHome user={currentUser} />
}
