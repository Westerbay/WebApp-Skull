import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  users_loading,
  users_error,
  users_retry,
} from "@workspace/i18n/messages"

export function UsersTableLoading() {
  return (
    <p role="status" className="flex items-center gap-2 p-5">
      <Spinner />
      {users_loading()}
    </p>
  )
}

type UsersTableErrorProps = {
  pending: boolean
  onRetry: () => Promise<void>
}

export function UsersTableError({ pending, onRetry }: UsersTableErrorProps) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 px-5 pb-4">
      <p>{users_error()}</p>
      <Button variant="outline" disabled={pending} onClick={onRetry}>
        {users_retry()}
      </Button>
    </div>
  )
}
