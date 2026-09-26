import { UsersTable } from "@/features/users/components/users-table"
import { welcome, home_description } from "@workspace/i18n/messages"
import type { CurrentUser } from "@workspace/contracts/identity"

export function AccountHome({ user }: { user: CurrentUser }) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {welcome({ name: user.name })}
      </h1>
      <p className="text-muted-foreground">{home_description()}</p>
      <p className="text-sm">{user.email}</p>
      <UsersTable key={user.id} />
    </section>
  )
}
