import assert from "node:assert/strict"
import {
  createLogsTestHarness,
  logsTestConfig,
  waitFor,
} from "./support/logs-test-harness.mjs"

const harness = await createLogsTestHarness()
try {
  harness.start()
  const loki = harness.getServiceUrl("loki", logsTestConfig.lokiPort)
  const checkLokiReady = async () =>
    assert.equal((await fetch(loki + "/ready")).status, 200)
  await waitFor(checkLokiReady)
  await harness.startDockerCollector()
  await harness.createLogProbe("staging", true)
  await harness.createLogProbe("production", true)
  await harness.createLogProbe("staging", false)

  const query = '{service_name="skull-api",environment="staging"}'
  const checkDockerLogs = async () => {
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
    assert.ok(lines.some((line) => line.event === "probe.staging.enabled"))
    return lines
  }
  const lines = await waitFor(checkDockerLogs)
  assert.ok(!lines.some((line) => line.event === "probe.production.enabled"))
  assert.ok(!lines.some((line) => line.event === "probe.staging.disabled"))
  const grafana = harness.getServiceUrl("grafana", logsTestConfig.grafanaPort)
  const response = await fetch(
    grafana +
      "/api/datasources/proxy/uid/loki/loki/api/v1/query_range?" +
      new URLSearchParams({
        query,
        since: logsTestConfig.queryWindow,
        limit: logsTestConfig.queryLimit,
      })
  )
  assert.equal(response.status, 200)
  assert.ok((await response.json()).data.result.length > 0)
  console.log(
    "Verified locally: integration Compose, Docker opt-in, environment isolation and stable service label through Grafana."
  )
} finally {
  await harness.close()
}
