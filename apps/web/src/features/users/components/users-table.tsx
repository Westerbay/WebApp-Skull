import { useId } from "react"
import { users_title, users_description } from "@workspace/i18n/messages"
import { useUsersTable } from "../hooks/use-users-table"
import { UsersTableContent } from "./users-table-content"
import { UsersTableError, UsersTableLoading } from "./users-table-feedback"
import { UsersTablePagination } from "./users-table-pagination"

export function UsersTable() {
  const titleId = useId()
  const {
    query,
    table,
    pageNumber,
    canGoPrevious,
    canGoNext,
    handlePreviousPage,
    handleNextPage,
    handleRetry,
  } = useUsersTable()

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <header className="space-y-2 p-5">
        <h2 id={titleId} className="text-xl font-semibold">
          {users_title()}
        </h2>
        <p className="text-sm text-muted-foreground">{users_description()}</p>
      </header>
      {query.isPending && <UsersTableLoading />}
      {query.isError && (
        <UsersTableError pending={query.isFetching} onRetry={handleRetry} />
      )}
      {query.data && (
        <>
          <UsersTableContent
            table={table}
            titleId={titleId}
            pending={query.isFetching}
          />
          <UsersTablePagination
            titleId={titleId}
            pageNumber={pageNumber}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            loadingNextPage={query.isFetchingNextPage}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        </>
      )}
    </section>
  )
}
