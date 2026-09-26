import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  users_previous,
  users_next,
  users_page,
} from "@workspace/i18n/messages"

type UsersTablePaginationProps = {
  titleId: string
  pageNumber: number
  canGoPrevious: boolean
  canGoNext: boolean
  loadingNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => Promise<void>
}

export function UsersTablePagination({
  titleId,
  pageNumber,
  canGoPrevious,
  canGoNext,
  loadingNextPage,
  onPreviousPage,
  onNextPage,
}: UsersTablePaginationProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {users_page({ page: pageNumber })}
      </p>
      <nav aria-labelledby={titleId} className="flex gap-2">
        <Button
          variant="outline"
          disabled={!canGoPrevious}
          onClick={onPreviousPage}
        >
          {users_previous()}
        </Button>
        <Button disabled={!canGoNext} onClick={onNextPage}>
          {loadingNextPage && <Spinner />}
          {users_next()}
        </Button>
      </nav>
    </footer>
  )
}
