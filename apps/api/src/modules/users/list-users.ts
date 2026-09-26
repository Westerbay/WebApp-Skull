import { asc, gt } from "drizzle-orm"
import { schema } from "@workspace/database"
import { createCursorPage } from "../../infrastructure/pagination/cursor-page.js"
import type { Database } from "@workspace/database"
import type { CurrentUser } from "@workspace/contracts/identity"
import type { CursorPagination } from "@workspace/contracts/pagination"
import type { ListUsers } from "./users.types.js"

function getUserCursor(user: CurrentUser) {
  return user.id
}

export function createListUsers(database: Database): ListUsers {
  const listUsers = async ({ cursor, limit }: CursorPagination) => {
    const rows = await database
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
      })
      .from(schema.user)
      .where(cursor === undefined ? undefined : gt(schema.user.id, cursor))
      .orderBy(asc(schema.user.id))
      .limit(limit + 1)
    return createCursorPage(rows, limit, getUserCursor)
  }

  return listUsers
}
