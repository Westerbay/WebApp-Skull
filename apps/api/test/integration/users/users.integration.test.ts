import { usersPageSchema } from "@workspace/contracts/users"
import request from "supertest"
import { expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { schema } from "@workspace/database"
import { createApiApp } from "../../../src/app.js"
import { createListUsers } from "../../../src/modules/users/list-users.js"
import { database } from "../../support/auth.harness.js"

it("traverses PostgreSQL users without duplicates and continues after a cursor row is deleted", async () => {
  const firstUserId = "pagination-test-001"
  const ids = [firstUserId, "pagination-test-002", "pagination-test-003"]
  await database.db.insert(schema.user).values(
    ids.map((id) => ({
      id,
      name: "Même nom",
      email: `${id}@example.test`,
      emailVerified: true,
    }))
  )
  const app = await createApiApp({
    authHandler: (_request, response) => response.sendStatus(404),
    getSession: async () => ({
      user: {
        id: firstUserId,
        name: "Test",
        email: "pagination-test-001@example.test",
        emailVerified: true,
      },
      session: { id: "pagination-test-session" },
    }),
    databaseReady: database.ready,
    listUsers: createListUsers(database.db),
  })
  await app.init()
  try {
    const first = await request(app.getHttpServer())
      .get("/api/users?limit=1&cursor=pagination-test-000")
      .expect(200)
    expect(first.body.items.map((user: { id: string }) => user.id)).toEqual([
      ids[0],
    ])
    expect(first.body.nextCursor).toBe(ids[0])
    await database.db.delete(schema.user).where(eq(schema.user.id, firstUserId))
    const next = await request(app.getHttpServer())
      .get(`/api/users?limit=1&cursor=${first.body.nextCursor}`)
      .expect(200)
    expect(next.body.items.map((user: { id: string }) => user.id)).toEqual([
      ids[1],
    ])

    const expected = await database.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .orderBy(schema.user.id)
    const seen: Array<string> = []
    let cursor: string | null = null
    do {
      const response: request.Response = await request(app.getHttpServer())
        .get("/api/users")
        .query({ limit: 7, ...(cursor ? { cursor } : {}) })
        .expect(200)
      const page = usersPageSchema.parse(response.body)
      expect(page.items.length).toBeLessThanOrEqual(7)
      expect(
        page.items.every(
          (user: object) =>
            Object.keys(user).sort().join(",") === "email,emailVerified,id,name"
        )
      ).toBe(true)
      seen.push(...page.items.map((user) => user.id))
      cursor = page.nextCursor
    } while (cursor !== null)
    expect(seen).toEqual(expected.map((user) => user.id))
    expect(new Set(seen).size).toBe(seen.length)
  } finally {
    await app.close()
    for (const id of ids)
      await database.db.delete(schema.user).where(eq(schema.user.id, id))
  }
})
