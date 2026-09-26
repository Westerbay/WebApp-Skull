import { useMemo, useState } from "react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { getUsersColumns } from "../components/users-table.columns"
import { usersTableConfig } from "../users.config"
import { useUsers } from "./use-users"
import type { CurrentUser } from "@workspace/contracts/identity"

const UNKNOWN_PAGE_COUNT = -1
const emptyUsers: Array<CurrentUser> = []

function getUserRowId(user: CurrentUser) {
  return user.id
}

export function useUsersTable() {
  const pageSize = usersTableConfig.pageSize
  const query = useUsers(pageSize)
  const [requestedPageIndex, setPageIndex] = useState(0)
  const columns = useMemo(getUsersColumns, [])
  const pages = query.data?.pages
  const pageCount = pages?.length ?? 0
  const pageIndex = Math.min(requestedPageIndex, Math.max(0, pageCount - 1))
  const hasCachedNextPage = pageIndex + 1 < pageCount
  const canGoPrevious = pageIndex > 0 && !query.isFetching
  const canGoNext =
    (hasCachedNextPage || query.hasNextPage) && !query.isFetching

  const table = useReactTable({
    data: pages?.[pageIndex]?.items ?? emptyUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getUserRowId,
    manualPagination: true,
    // Cursor navigation does not know the total number of pages in advance.
    pageCount: query.hasNextPage ? UNKNOWN_PAGE_COUNT : pageCount,
    state: { pagination: { pageIndex, pageSize } },
  })

  function handlePreviousPage() {
    if (!canGoPrevious) return
    setPageIndex(pageIndex - 1)
  }

  async function handleNextPage() {
    if (!canGoNext) return
    const nextPageIndex = pageIndex + 1
    if (hasCachedNextPage) {
      setPageIndex(nextPageIndex)
      return
    }
    await loadNextPage(nextPageIndex)
  }

  async function loadNextPage(nextPageIndex: number) {
    const result = await query.fetchNextPage()
    if (!result.isError && (result.data?.pages.length ?? 0) > nextPageIndex) {
      setPageIndex(nextPageIndex)
    }
  }

  async function handleRetry() {
    if (query.isFetching) return
    if (query.isFetchNextPageError) {
      await loadNextPage(pageCount)
      return
    }
    await query.refetch()
  }

  return {
    query,
    table,
    pageNumber: pageIndex + 1,
    canGoPrevious,
    canGoNext,
    handlePreviousPage,
    handleNextPage,
    handleRetry,
  }
}
