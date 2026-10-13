import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { sign_in, sign_out } from "@workspace/i18n/messages"
import { authClient } from "@/lib/auth/auth-client"
import { useSignOut } from "../hooks/use-sign-out"

export function SessionActions() {
  const session = authClient.useSession()
  const { signOut, pending } = useSignOut()

  if (session.data?.user.emailVerified) {
    return (
      <Button variant="outline" onClick={signOut} disabled={pending}>
        {sign_out()}
      </Button>
    )
  }

  return (
    <Button variant="outline" asChild>
      <Link to="/sign-in">{sign_in()}</Link>
    </Button>
  )
}
