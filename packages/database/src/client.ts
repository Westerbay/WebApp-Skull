import { drizzle } from "drizzle-orm/postgres-js"
import { sql } from "drizzle-orm"
import postgres from "postgres"

import { databaseConfig } from "./config.js"
import * as schema from "./schema/index.js"

export interface DatabaseObservation {
  connections: number
  activeConnections: number
  lockWaitingConnections: number
  serverConnections: number
  maxConnections: number
}

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: databaseConfig.maxConnections,
    prepare: false,
  })
  const db = drizzle({
    client,
    schema,
  })

  return {
    db,
    close: () => client.end(),
    ready: async () => {
      await db.execute(sql`select 1`)
    },
    observe: async (): Promise<DatabaseObservation> => {
      // Aggregate counts only. Activity states are scoped to this database/role.
      const [row] = await client<Array<DatabaseObservation>>`
        select
          count(*) filter (where datname = current_database() and usename = current_user)::int as connections,
          count(*) filter (where datname = current_database() and usename = current_user and state = 'active')::int as "activeConnections",
          count(*) filter (where datname = current_database() and usename = current_user and wait_event_type = 'Lock')::int as "lockWaitingConnections",
          count(*)::int as "serverConnections",
          current_setting('max_connections')::int as "maxConnections"
        from pg_stat_activity
        where backend_type = 'client backend'
      `
      if (!row) throw new Error("Database observation returned no result")
      return row
    },
  }
}

export type Database = ReturnType<typeof createDatabase>["db"]
