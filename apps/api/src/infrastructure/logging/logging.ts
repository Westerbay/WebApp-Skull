import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { LoggerModule } from "nestjs-pino"
import pino from "pino"
import { pinoHttp } from "pino-http"
import type { DynamicModule } from "@nestjs/common"
import type { RequestHandler } from "express"
import type { DestinationStream, Logger } from "pino"
import type { Options as PinoHttpOptions } from "pino-http"
import type { ApiEnv } from "../../config/env.js"
import type { LoggingOptions } from "./logging.config.js"

const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "response.headers.set-cookie",
  "authorization",
  "cookie",
  "password",
  "token",
  "url",
  "email",
  "ip",
  "err.message",
  "error.message",
]

export function createApiLogger(
  environment: ApiEnv["APP_ENV"],
  destination?: DestinationStream,
  options: LoggingOptions = {}
): Logger {
  const pretty =
    options.format === "pretty" ||
    (environment === "development" && options.format !== "json")
  const transport =
    pretty && !destination
      ? {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        }
      : undefined

  const level =
    options.level ?? (environment === "production" ? "info" : "debug")
  let output = destination
  if (options.file && !destination) {
    mkdirSync(dirname(options.file), { recursive: true })
    output = pino.multistream([
      { level, stream: process.stdout },
      { level, stream: pino.destination({ dest: options.file, sync: true }) },
    ])
  }

  return pino(
    {
      enabled: environment !== "test",
      level,
      base: { service_name: "skull-api", environment },
      redact: { paths: REDACTED_PATHS, censor: "[Redacted]" },
      transport,
    },
    output
  )
}

function requestId(
  request: Parameters<NonNullable<PinoHttpOptions["genReqId"]>>[0],
  response: Parameters<NonNullable<PinoHttpOptions["genReqId"]>>[1]
) {
  const id = typeof request.id === "string" ? request.id : randomUUID()
  response.setHeader("x-request-id", id)
  return id
}

function httpOptions(logger: Logger): PinoHttpOptions {
  return {
    logger,
    genReqId: requestId,
    customAttributeKeys: {
      req: "request",
      res: "response",
      responseTime: "durationMs",
    },
    serializers: {
      req(request) {
        const path = new URL(request.url, "http://localhost").pathname
        return { requestId: request.id, method: request.method, path }
      },
      res(response) {
        return { status: response.statusCode }
      },
      err(error) {
        return { type: error.constructor.name }
      },
    },
  }
}

export function createHttpLogging(logger: Logger): Readonly<{
  middleware: RequestHandler
  module: DynamicModule
}> {
  const options = httpOptions(logger)
  const contextOptions = {
    ...options,
    autoLogging: false,
  }

  return {
    middleware: pinoHttp(options),
    module: LoggerModule.forRoot({ pinoHttp: contextOptions }),
  }
}
