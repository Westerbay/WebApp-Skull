import assert from "node:assert/strict"
import { createApiApp } from "../apps/api/dist/app.js"
import { createApiLogger } from "../apps/api/dist/infrastructure/logging/logging.js"

import {
  createLogsTestHarness,
  logsTestConfig,
  waitFor,
} from "./support/logs-test-harness.mjs"

const harness = await createLogsTestHarness()

let app
try {
  harness.start()
  const loki = harness.getServiceUrl("loki", logsTestConfig.lokiPort)
  const grafana = harness.getServiceUrl("grafana", logsTestConfig.grafanaPort)
  const checkServicesReady = async () => {
    assert.equal((await fetch(loki + "/ready")).status, 200)
    assert.equal((await fetch(grafana + "/api/health")).status, 200)
  }
  await waitFor(checkServicesReady)

  const logger = createApiLogger("development", undefined, {
    format: "json",
    file: harness.directory + "/api.jsonl",
  })
  logger.debug({ event: "logs.debug_probe" })
  const authHandler = (_request, response) => response.sendStatus(404)
  const getSession = () => {
    throw new Error("private-session-secret")
  }
  const databaseReady = () => Promise.resolve()
  app = await createApiApp({ logger, authHandler, getSession, databaseReady })
  await app.listen(0, "127.0.0.1")
  const api = await app.getUrl()
  const response = await fetch(
    api + "/health/live?token=private-query-secret",
    {
      headers: { Authorization: "Bearer private-header-secret" },
    }
  )
  assert.equal(response.status, 200)
  const requestId = response.headers.get("x-request-id")
  assert.ok(requestId)
  const failure = await fetch(api + "/api/me")
  assert.equal(failure.status, 500)
  const failureId = failure.headers.get("x-request-id")

  const query = '{service_name="skull-api",environment="development"}'
  const checkCollectedLogs = async () => {
    const response = await fetch(
      loki +
        "/loki/api/v1/query_range?" +
        new URLSearchParams({
          query,
          since: logsTestConfig.queryWindow,
          limit: logsTestConfig.queryLimit,
        })
    )
    assert.equal(response.status, 200)
    const payload = await response.json()
    const lines = payload.data.result.flatMap((stream) =>
      stream.values.map(([, line]) => JSON.parse(line))
    )
    assert.ok(lines.some((line) => line.request?.requestId === requestId))
    assert.ok(
      lines.some(
        (line) =>
          line.request?.requestId === failureId && line.response?.status === 500
      )
    )
    return lines
  }
  const result = await waitFor(checkCollectedLogs)
  assert.ok(result.some((line) => line.event === "logs.debug_probe"))
  const requestLines = result.filter(
    (line) => line.request?.requestId === requestId && line.response
  )
  assert.equal(requestLines.length, 1, "HTTP logs must not be duplicated")
  assert.equal(requestLines[0].request.path, "/health/live")
  assert.equal(requestLines[0].response.status, 200)
  assert.equal(typeof requestLines[0].durationMs, "number")
  assert.ok(
    result.some(
      (line) =>
        line.request?.requestId === failureId &&
        line.context === "HttpErrorFilter"
    ),
    "Nest error logs must carry the HTTP request context"
  )
  assert.ok(!JSON.stringify(result).includes("private-"))

  const dashboard = await fetch(grafana + "/api/dashboards/uid/skull-api-logs")
  assert.equal(dashboard.status, 200)

  const health = await fetch(grafana + "/api/datasources/uid/loki/health")
  assert.equal(health.status, 200, await health.text())
  const proxy = await fetch(
    grafana +
      "/api/datasources/proxy/uid/loki/loki/api/v1/query_range?" +
      new URLSearchParams({
        query,
        since: logsTestConfig.queryWindow,
        limit: logsTestConfig.queryLimit,
      })
  )
  assert.equal(proxy.status, 200)
  assert.ok((await proxy.json()).data.result.length > 0)
  console.log(
    "Verified: real Nest HTTP → Pino JSON file → Alloy → Loki → Grafana; request context, no duplicate HTTP logs, no secret leakage."
  )
} catch (error) {
  console.error(harness.diagnostics())
  throw error
} finally {
  try {
    await app?.close()
  } finally {
    await harness.close()
  }
}
