import { Link } from "@tanstack/react-router"
import projectConfig from "@workspace/config/project" with { type: "json" }
import { Button } from "@workspace/ui/components/button"
import { primary_navigation, sign_in, sign_out } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { useSignOut } from "@/features/auth/hooks/use-sign-out"

export function AppHeader() {
  const session = authClient.useSession()
  const { signOut, pending } = useSignOut()
  return (
    <header className="border-b">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <nav aria-label={primary_navigation()}>
          <Button variant="ghost" asChild>
            <Link to="/">{projectConfig.name}</Link>
          </Button>
        </nav>
        {session.data?.user.emailVerified ? (
          <Button variant="outline" onClick={signOut} disabled={pending}>
            {sign_out()}
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/sign-in">{sign_in()}</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
