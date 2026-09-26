import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const envFile = resolve(root, ".env")

if (!existsSync(envFile)) {
  throw new Error(
    "Missing .env: copy .env.example before running pnpm run setup"
  )
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? 1})`)
  }
}

run("docker", ["compose", "up", "-d", "--wait"])
run("pnpm", ["--filter", "@workspace/database", "build"])
run(process.execPath, [
  `--env-file=${envFile}`,
  "packages/database/dist/cli/migrate.js",
])
