import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

export const logsTestConfig = {
  startupTimeoutMs: 60_000,
  pollIntervalMs: 1000,
  lokiPort: 3100,
  grafanaPort: 3000,
  queryWindow: "5m",
  queryLimit: "1000",
  diagnosticTail: "15",
}

export async function createLogsTestHarness() {
  const root = fileURLToPath(new URL("../../", import.meta.url))
  const output = fileURLToPath(new URL("../../output/", import.meta.url))
  await mkdir(output, { recursive: true })
  const directory = await mkdtemp(output + "logs-test-")
  const project = "skull-logs-" + randomUUID()
  const override = directory + "/compose.yml"
  await writeFile(
    override,
    `services:
    loki:
      ports: !override
        - "127.0.0.1::${logsTestConfig.lokiPort}"
    grafana:
      ports: !override
        - "127.0.0.1::${logsTestConfig.grafanaPort}"
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

  const getServiceUrl = (service, containerPort) => {
    const address = compose("port", service, String(containerPort)).trim()
    return "http://" + address
  }

  const start = () => compose("up", "-d")
  const diagnostics = () =>
    compose("logs", "--tail", logsTestConfig.diagnosticTail, "alloy")
  const close = async () => {
    compose("down", "--volumes", "--remove-orphans")
    await rm(directory, { recursive: true, force: true })
  }
  return { directory, start, getServiceUrl, diagnostics, close }
}

export async function waitFor(check) {
  const deadline = Date.now() + logsTestConfig.startupTimeoutMs
  const pause = () => {
    const waitInterval = (resolve) =>
      setTimeout(resolve, logsTestConfig.pollIntervalMs)
    return new Promise(waitInterval)
  }
  let lastError
  while (Date.now() < deadline) {
    try {
      return await check()
    } catch (error) {
      lastError = error
    }
    await pause()
  }
  throw lastError
}
