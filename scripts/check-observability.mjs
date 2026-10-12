import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const compose = await readFile(
  new URL("../compose.observability.yml", import.meta.url),
  "utf8"
)
const image = compose.match(/^\s+image: (prom\/prometheus:\S+)$/m)?.[1]
if (!image) throw new Error("Pinned Prometheus image not found")
const config = fileURLToPath(
  new URL("../infra/observability/prometheus/", import.meta.url)
)
for (const args of [
  ["check", "config", "prometheus.yml"],
  ["test", "rules", "rules.test.yml"],
]) {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--entrypoint",
      "promtool",
      "-v",
      config + ":/etc/prometheus:ro",
      "-w",
      "/etc/prometheus",
      image,
      ...args,
    ],
    { cwd: root, stdio: "inherit" }
  )
}

const alloyImage = compose.match(/^\s+image: (grafana\/alloy:\S+)$/m)?.[1]
if (!alloyImage) throw new Error("Pinned Alloy image not found")
execFileSync(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "none",
    "-e",
    "OBS_POSTGRES_DSN=postgresql://fixture:fixture@localhost/fixture",
    "-e",
    "OBS_VALKEY_URL=redis://localhost:6379",
    "-v",
    fileURLToPath(new URL("../infra/observability/", import.meta.url)) +
      ":/etc/alloy:ro",
    alloyImage,
    "validate",
    "/etc/alloy/config.alloy",
  ],
  { cwd: root, stdio: "inherit" }
)
