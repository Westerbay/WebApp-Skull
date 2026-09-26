import { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  users_title,
  users_description,
  users_name,
  users_email,
  users_status,
  users_verified,
  users_unverified,
  users_loading,
  users_empty,
  users_error,
  users_retry,
  users_previous,
  users_next,
  users_page,
} from "@workspace/i18n/messages"
import { useUsers } from "../hooks/use-users"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import type { CurrentUser } from "@workspace/contracts/identity"

export function UsersTable() {
  const query = useUsers()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const pages = query.data?.pages ?? []
  const pageIndex = Math.min(
    pagination.pageIndex,
    Math.max(0, pages.length - 1)
  )
  const columns: Array<ColumnDef<CurrentUser>> = [
    { accessorKey: "name", header: users_name() },
    { accessorKey: "email", header: users_email() },
    {
      accessorKey: "emailVerified",
      header: users_status(),
      cell: ({ row }) =>
        row.original.emailVerified ? users_verified() : users_unverified(),
    },
  ]
  const table = useReactTable({
    data: pages[pageIndex]?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount: query.hasNextPage ? -1 : pages.length,
    state: { pagination: { ...pagination, pageIndex } },
    onPaginationChange: setPagination,
  })

  async function nextPage() {
    if (query.isFetching) return
    if (pageIndex + 1 < pages.length) {
      setPagination((previous) => ({ ...previous, pageIndex: pageIndex + 1 }))
    } else if (query.hasNextPage) {
      const result = await query.fetchNextPage()
      if (!result.isError && (result.data?.pages.length ?? 0) > pageIndex + 1) {
        setPagination((previous) => ({ ...previous, pageIndex: pageIndex + 1 }))
      }
    }
  }

  return (
    <section
      aria-labelledby="users-title"
      className="rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <header className="space-y-2 p-5">
        <h2 id="users-title" className="text-xl font-semibold">
          {users_title()}
        </h2>
        <p className="text-sm text-muted-foreground">{users_description()}</p>
      </header>
      {query.isPending ? (
        <p role="status" className="flex items-center gap-2 p-5">
          <Spinner />
          {users_loading()}
        </p>
      ) : (
        <>
          {query.isError && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 px-5 pb-4"
            >
              <p>{users_error()}</p>
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() =>
                  void (query.isFetchNextPageError
                    ? query.fetchNextPage()
                    : query.refetch())
                }
              >
                {users_retry()}
              </Button>
            </div>
          )}
          {query.data && (
            <div
              className="overflow-x-auto"
              role="region"
              aria-labelledby="users-title"
              tabIndex={0}
              aria-busy={query.isFetching}
            >
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{users_title()}</caption>
                <thead className="border-y bg-muted/50">
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th
                          key={header.id}
                          scope="col"
                          className="px-5 py-3 font-medium"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-5 py-8 text-center text-muted-foreground"
                      >
                        {users_empty()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {query.data && (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
              <p
                role="status"
                aria-live="polite"
                className="text-sm text-muted-foreground"
              >
                {users_page({ page: pageIndex + 1 })}
              </p>
              <nav aria-labelledby="users-title" className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pageIndex === 0 || query.isFetching}
                  onClick={() => table.previousPage()}
                >
                  {users_previous()}
                </Button>
                <Button
                  disabled={
                    query.isFetching ||
                    !(pageIndex + 1 < pages.length || query.hasNextPage)
                  }
                  onClick={() => void nextPage()}
                >
                  {query.isFetchingNextPage && <Spinner />}
                  {users_next()}
                </Button>
              </nav>
            </footer>
          )}
        </>
      )}
    </section>
  )
}
