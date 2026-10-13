import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../..")
const [stack, action, ...extra] = process.argv.slice(2)
const stacks = {
  logs: {
    file: "infra/compose/observability.yml",
    up: ["-d"],
  },
  valkey: {
    file: "infra/compose/valkey.yml",
    up: ["-d", "--wait", "--wait-timeout", "90"],
  },
}

if (
  !Object.hasOwn(stacks, stack) ||
  !["up", "down"].includes(action) ||
  extra.length > 0
) {
  throw new Error("Usage: stack.mjs <logs|valkey> <up|down>")
}

const configuration = stacks[stack]
if (stack === "logs" && action === "up") {
  // Create the bind mount as the developer before Docker can create it as root.
  await mkdir(resolve(root, "output/logs"), { recursive: true })
}

const directory = await mkdtemp(join(tmpdir(), "template-compose-"))
try {
  // An empty file suppresses implicit .env loading without a Unix-only path.
  const args = [
    "compose",
    "--env-file",
    join(directory, "empty.env"),
    "-f",
    configuration.file,
    action,
  ]
  await writeFile(join(directory, "empty.env"), "")
  if (action === "up") args.push(...configuration.up)
  const result = spawnSync("docker", args, { cwd: root, stdio: "inherit" })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  await rm(directory, { recursive: true, force: true })
}
