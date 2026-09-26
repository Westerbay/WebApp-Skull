import { toNodeHandler } from "better-auth/node"

import { createDatabase } from "@workspace/database"
import {
  MemoryEmailSender,
  createSmtpSender,
  getEmailConfig,
} from "@workspace/email"
import { createListUsers } from "./modules/users/list-users.js"
import { createApiApp } from "./app.js"
import { getEnv } from "./config/env.js"
import { createAuth } from "./infrastructure/auth/auth.js"
import { AuthEmailDispatcher } from "./infrastructure/email/auth-email-dispatcher.js"
import { createShutdown } from "./infrastructure/lifecycle/shutdown.js"
import { createApiLogger } from "./infrastructure/logging/logging.js"
import { getLoggingConfig } from "./infrastructure/logging/logging.config.js"
import { setupOpenApi } from "./openapi/document.js"

const env = getEnv()
const logger = createApiLogger(
  env.APP_ENV,
  undefined,
  getLoggingConfig(env.APP_ENV)
)
const database = createDatabase(env.DATABASE_URL)
const emailConfig = getEmailConfig(process.env)
const sender =
  emailConfig.EMAIL_MODE === "memory"
    ? new MemoryEmailSender()
    : createSmtpSender(emailConfig)
const emails = new AuthEmailDispatcher(sender, (event) => {
  logger.info(event)
})
const auth = createAuth(database.db, env, emails, (level) => {
  const method =
    level === "error" ? "error" : level === "warn" ? "warn" : "info"
  logger[method]({ event: "auth.provider", providerLevel: level })
})
const app = await createApiApp({
  authHandler: toNodeHandler(auth),
  getSession: async (headers) => {
    const session = await auth.api.getSession({ headers })

    if (!session) {
      return null
    }

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      },
      session: {
        id: session.session.id,
      },
    }
  },
  listUsers: createListUsers(database.db),
  databaseReady: database.ready,
  allowedOrigin: env.WEB_URL,
  logger,
})

if (process.env.NODE_ENV !== "production") setupOpenApi(app)

await app.listen(env.API_PORT)
logger.info({ event: "api.started", port: env.API_PORT })

const shutdown = createShutdown(
  [
    { name: "server", close: () => app.close() },
    { name: "email", close: () => emails.close() },
    { name: "database", close: () => database.close() },
  ],
  (event) => {
    if (event.event === "api.shutdown_failed") logger.error(event)
    else logger.info(event)
  }
)

const handleSignal = () => {
  void shutdown().catch(() => {
    process.exitCode = 1
  })
}

process.once("SIGINT", handleSignal)
process.once("SIGTERM", handleSignal)
