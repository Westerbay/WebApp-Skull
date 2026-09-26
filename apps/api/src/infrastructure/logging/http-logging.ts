import { randomUUID } from "node:crypto"
import { LoggerModule } from "nestjs-pino"
import { pinoHttp } from "pino-http"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { DynamicModule } from "@nestjs/common"
import type { RequestHandler } from "express"
import type { Logger } from "pino"
import type { Options as PinoHttpOptions, ReqId } from "pino-http"

function requestId(request: IncomingMessage, response: ServerResponse) {
  const id = typeof request.id === "string" ? request.id : randomUUID()
  response.setHeader("x-request-id", id)
  return id
}

interface HttpRequestLogInput {
  id: ReqId
  method: string
  url: string
}

interface HttpResponseLogInput {
  statusCode: number
}

function serializeRequest(request: HttpRequestLogInput) {
  const path = new URL(request.url, "http://localhost").pathname
  return { requestId: request.id, method: request.method, path }
}

function serializeResponse(response: HttpResponseLogInput) {
  return { status: response.statusCode }
}

function serializeError(error: object) {
  return { type: error.constructor.name }
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
      req: serializeRequest,
      res: serializeResponse,
      err: serializeError,
    },
  }
}

interface HttpLogging {
  readonly middleware: RequestHandler
  readonly module: DynamicModule
}

export function createHttpLogging(logger: Logger): HttpLogging {
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
