import { createFileRoute, redirect } from "@tanstack/react-router"
import { AccountSummary } from "@/features/auth/components/account-summary"
import { UsersTable } from "@/features/users/components/users-table"
import { home_title, home_description } from "@workspace/i18n/messages"
import { privateHead } from "@/lib/seo/private-head"
import {
  AuthenticationRequiredError,
  loadCurrentUserForProtectedRoute,
} from "@/features/auth/queries/current-user.queries"

export const Route = createFileRoute("/")({
  ssr: false,
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
  head: () => privateHead(home_title(), home_description()),
  component: HomePage,
})

function HomePage() {
  const { currentUser } = Route.useRouteContext()

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-10">
      <AccountSummary user={currentUser} />
      <UsersTable key={currentUser.id} />
    </section>
  )
}
