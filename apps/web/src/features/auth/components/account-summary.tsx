import { welcome, home_description } from "@workspace/i18n/messages"
import type { CurrentUser } from "@workspace/contracts/identity"

export function AccountSummary({ user }: { user: CurrentUser }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {welcome({ name: user.name })}
      </h1>
      <p className="text-muted-foreground">{home_description()}</p>
      <p className="text-sm">{user.email}</p>
    </>
  )
}
