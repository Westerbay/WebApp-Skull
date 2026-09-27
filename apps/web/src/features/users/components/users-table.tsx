import { useId } from "react"
import {
  users_title,
  users_description,
  users_search_label,
  users_search_placeholder,
  users_search_pending,
} from "@workspace/i18n/messages"
import { Input } from "@workspace/ui/components/input"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { usersSearchConstraints } from "@workspace/contracts/users/constraints"
import { useUsersTable } from "../hooks/use-users-table"
import { UsersTableContent } from "./users-table-content"
import { UsersTableError, UsersTableLoading } from "./users-table-feedback"
import { UsersTablePagination } from "./users-table-pagination"

export function UsersTable() {
  const titleId = useId()
  const searchId = useId()
  const {
    query,
    search,
    searchPending,
    handleSearchChange,
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
        <Field>
          <FieldLabel htmlFor={searchId}>{users_search_label()}</FieldLabel>
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder={users_search_placeholder()}
            maxLength={usersSearchConstraints.maxLength}
            className="min-h-11"
          />
        </Field>
        {searchPending && (
          <p role="status" className="text-sm text-muted-foreground">
            {users_search_pending()}
          </p>
        )}
      </header>
      {query.isPending && <UsersTableLoading />}
      {query.isError && (
        <UsersTableError
          pending={query.isFetching || searchPending}
          onRetry={handleRetry}
        />
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
