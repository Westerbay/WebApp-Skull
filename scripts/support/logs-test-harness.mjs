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

  const probes = []
  let collectorStarted = false
  const collectorOverride = directory + "/collector.yml"
  const collectorCompose = (...args) =>
    execFileSync(
      "docker",
      [
        "compose",
        "--env-file",
        "/dev/null",
        "-p",
        project + "-collector",
        "-f",
        "compose.logs-collector.yml",
        "-f",
        collectorOverride,
        ...args,
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          APP_ENV: "staging",
          LOKI_URL: "http://loki:3100/loki/api/v1/push",
          LOKI_TOKEN_FILE: "",
          LOKI_TENANT_ID: "",
        },
      }
    )
  const startDockerCollector = async () => {
    await writeFile(
      collectorOverride,
      [
        "networks:",
        "  default:",
        "    external: true",
        "    name: " + project + "_default",
        "",
      ].join("\n")
    )
    collectorStarted = true
    collectorCompose("up", "-d")
  }
  const createLogProbe = async (environment, enabled) => {
    const name = project + "-" + environment + "-" + String(enabled)
    const file = directory + "/" + name + ".jsonl"
    await writeFile(
      file,
      JSON.stringify({
        service_name: "skull-api",
        environment,
        level: 30,
        time: Date.now(),
        event:
          "probe." + environment + "." + (enabled ? "enabled" : "disabled"),
      }) + "\n"
    )
    probes.push(name)
    execFileSync(
      "docker",
      [
        "run",
        "-d",
        "--name",
        name,
        "--label",
        "skull.logs=" + String(enabled),
        "--label",
        "skull.logs.environment=" + environment,
        "--label",
        "com.docker.compose.service=renamed-api",
        "-v",
        file + ":/probe.jsonl:ro",
        "--entrypoint",
        "/bin/sh",
        "grafana/grafana:13.2.2",
        "-c",
        "sleep 3; cat /probe.jsonl; sleep 120",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
  }

  const start = () => compose("up", "-d")
  const diagnostics = () =>
    compose("logs", "--tail", logsTestConfig.diagnosticTail, "alloy")
  const close = async () => {
    try {
      if (collectorStarted)
        collectorCompose("down", "--volumes", "--remove-orphans")
    } finally {
      for (const name of probes) {
        execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" })
      }
      compose("down", "--volumes", "--remove-orphans")
    }
    await rm(directory, { recursive: true, force: true })
  }
  return {
    directory,
    start,
    getServiceUrl,
    diagnostics,
    close,
    startDockerCollector,
    createLogProbe,
  }
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
