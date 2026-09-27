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
import { getValkeyConfig } from "./infrastructure/valkey/valkey.config.js"
import { createValkey } from "./infrastructure/valkey/valkey.js"
import { ValkeyRateLimitStore } from "./infrastructure/rate-limit/valkey-rate-limit-store.js"
import type { ValkeyConnection } from "./infrastructure/valkey/valkey.js"
import type { EmailSender } from "@workspace/core/email"
import type { EmailEvent } from "./infrastructure/email/auth-email-dispatcher.js"
import type { ShutdownEvent } from "./infrastructure/lifecycle/shutdown.js"
import type { GetSession } from "./infrastructure/auth/session.js"

const env = getEnv()
const valkeyConfig = getValkeyConfig()
const logger = createApiLogger(
  env.APP_ENV,
  undefined,
  getLoggingConfig(env.APP_ENV)
)
let valkey: ValkeyConnection | undefined
const reportValkeyUnavailable = () => {
  logger.warn({ event: "valkey.unavailable" })
}
if (valkeyConfig.VALKEY_ENABLED === "true" && valkeyConfig.VALKEY_URL) {
  valkey = createValkey(valkeyConfig.VALKEY_URL, reportValkeyUnavailable)
  try {
    await valkey.client.connect()
    await valkey.ready()
  } catch {
    await valkey.close()
    throw new Error("Valkey startup failed")
  }
}
const database = createDatabase(env.DATABASE_URL)
const emailConfig = getEmailConfig(process.env)
let sender: EmailSender
if (emailConfig.EMAIL_MODE === "memory") {
  sender = new MemoryEmailSender()
} else {
  sender = createSmtpSender(emailConfig)
}

const reportEmailEvent = (event: EmailEvent) => {
  logger.info(event)
}
const reportProviderLog = (level: string) => {
  const event = { event: "auth.provider", providerLevel: level }
  if (level === "error") {
    logger.error(event)
    return
  }
  if (level === "warn") {
    logger.warn(event)
    return
  }
  logger.info(event)
}
const emails = new AuthEmailDispatcher(sender, reportEmailEvent)
const auth = createAuth(database.db, env, emails, reportProviderLog)
const getSession: GetSession = async (headers) => {
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
    session: { id: session.session.id },
  }
}
const infrastructureReady = async () => {
  await Promise.all([database.ready(), valkey?.ready()])
}
let rateLimitStorage: ValkeyRateLimitStore | undefined
if (valkey) {
  rateLimitStorage = new ValkeyRateLimitStore(
    valkey.client,
    valkeyConfig.VALKEY_NAMESPACE
  )
}
const app = await createApiApp({
  authHandler: toNodeHandler(auth),
  getSession,
  listUsers: createListUsers(database.db),
  databaseReady: infrastructureReady,
  rateLimitStorage,
  allowedOrigin: env.WEB_URL,
  logger,
})

if (process.env.NODE_ENV !== "production") {
  setupOpenApi(app)
}

await app.listen(env.API_PORT)
logger.info({ event: "api.started", port: env.API_PORT })

const closeServer = () => app.close()
const closeEmails = () => emails.close()
const closeValkey = async () => {
  await valkey?.close()
}
const reportShutdownEvent = (event: ShutdownEvent) => {
  if (event.event === "api.shutdown_failed") {
    logger.error(event)
    return
  }
  logger.info(event)
}
const shutdown = createShutdown(
  [
    { name: "server", close: closeServer },
    { name: "email", close: closeEmails },
    { name: "valkey", close: closeValkey },
    { name: "database", close: database.close },
  ],
  reportShutdownEvent
)
const handleShutdownFailure = () => {
  process.exitCode = 1
}

const handleSignal = () => {
  void shutdown().catch(handleShutdownFailure)
}

process.once("SIGINT", handleSignal)
process.once("SIGTERM", handleSignal)
