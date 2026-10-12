export {
  createDatabase,
  type Database,
  type DatabaseObservation,
} from "./client.js"
export * as schema from "./schema/index.js"
export {
  verifyDatabaseTarget,
  withVerifiedDatabaseTarget,
  type DatabaseOperation,
  type VerifiedDatabaseTarget,
} from "./target.js"
