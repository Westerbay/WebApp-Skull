import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createApiApp } from "../apps/api/dist/app.js"
import { createApiLogger } from "../apps/api/dist/infrastructure/logging/logging.js"

const root = fileURLToPath(new URL("../", import.meta.url))
const output = fileURLToPath(new URL("../output/", import.meta.url))
await mkdir(output, { recursive: true })
const directory = await mkdtemp(output + "logs-test-")
const project = "skull-logs-" + randomUUID()
const override = directory + "/compose.yml"
await writeFile(
  override,
  `services:
  loki:
    ports: !override
      - "127.0.0.1::3100"
  grafana:
    ports: !override
      - "127.0.0.1::3000"
  alloy:
    ports: !override []
    volumes:
      - ${directory}:/var/log/skull:ro
`
)

const compose = (...args) =>
  execFileSync(
    "docker",
    [
      "compose",
      "--env-file",
      "/dev/null",
      "-p",
      project,
      "-f",
      "compose.observability.yml",
      "-f",
      override,
      ...args,
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  )

const port = (service, containerPort) => {
  const address = compose("port", service, String(containerPort)).trim()
  return "http://" + address
}

const waitFor = async (check) => {
  const deadline = Date.now() + 60_000
  let lastError
  while (Date.now() < deadline) {
    try {
      return await check()
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw lastError
}

let app
try {
  compose("up", "-d")
  const loki = port("loki", 3100)
  const grafana = port("grafana", 3000)
  await waitFor(async () => {
    assert.equal((await fetch(loki + "/ready")).status, 200)
    assert.equal((await fetch(grafana + "/api/health")).status, 200)
  })

  const logger = createApiLogger("development", undefined, {
    format: "json",
    file: directory + "/api.jsonl",
  })
  logger.debug({ event: "logs.debug_probe" })
  app = await createApiApp({
    logger,
    authHandler: (_request, response) => response.sendStatus(404),
    getSession: () => {
      throw new Error("private-session-secret")
    },
    databaseReady: () => Promise.resolve(),
  })
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
  const result = await waitFor(async () => {
    const response = await fetch(
      loki +
        "/loki/api/v1/query_range?" +
        new URLSearchParams({ query, since: "5m", limit: "1000" })
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
  })
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
      new URLSearchParams({ query, since: "5m", limit: "1000" })
  )
  assert.equal(proxy.status, 200)
  assert.ok((await proxy.json()).data.result.length > 0)
  console.log(
    "Verified: real Nest HTTP → Pino JSON file → Alloy → Loki → Grafana; request context, no duplicate HTTP logs, no secret leakage."
  )
} catch (error) {
  console.error(compose("logs", "--tail", "15", "alloy"))
  throw error
} finally {
  await app?.close()
  compose("down", "--volumes", "--remove-orphans")
  await rm(directory, { recursive: true, force: true })
}
