import { spawnSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const action = process.argv[2]
if (action !== "up" && action !== "down") {
  throw new Error("Expected logs stack action: up or down")
}

const root = fileURLToPath(new URL("../", import.meta.url))
if (action === "up") {
  // Create the bind mount as the developer, before Docker can create it as root.
  await mkdir(new URL("../output/logs/", import.meta.url), { recursive: true })
}

const args = [
  "compose",
  "--env-file",
  "/dev/null",
  "-f",
  "compose.observability.yml",
  action,
]
if (action === "up") {
  args.push("-d")
}
const result = spawnSync("docker", args, { cwd: root, stdio: "inherit" })
if (result.error) {
  throw result.error
}
process.exitCode = result.status ?? 1
